import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { ALL_STATUSES, api, dzd, orderTotalOf, STATUS_COLOR, STATUS_LABEL } from '../../lib/api';
import { AnimNum, Bar, GrowBar, BOTTOM_PAD, C, Card, GlassGlow, s, StatusPill, useTopPad } from '../../components/ui';
import { loadCache, saveCache } from '../../lib/cache';

const GOAL_KEY = 'monthlyGoal';
const HIDE_KEY = 'hideMoney';

export default function Profit() {
  const top = useTopPad();
  const [orders, setOrders] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [goal, setGoal] = useState(100000);
  const [hide, setHide] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [or, st] = await Promise.all([api.orders(), api.stats()]);
      setOrders(Array.isArray(or) ? or : []); setStats(Array.isArray(st) ? st : []);
      saveCache('profit', { orders: or, stats: st });
    } catch {
      const cached = await loadCache('profit');
      if (cached) { setOrders(cached.orders || []); setStats(cached.stats || []); }
    }
    AsyncStorage.getItem(GOAL_KEY).then((g) => { if (g) setGoal(Number(g) || 100000); }).catch(() => {});
    AsyncStorage.getItem(HIDE_KEY).then((h) => setHide(h === '1')).catch(() => {});
    setLoading(false); setRefreshing(false);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const money = (n: number) => (hide ? '••••••' : dzd(n));
  const dayStart = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); };
  const deliveredSince = (fromMs: number) => orders.filter((o) => o.status === 'delivered' && new Date(o.createdAt).getTime() >= fromMs);
  const revenueIn = (days: number) => deliveredSince(dayStart(new Date()) - (days - 1) * 86400000).reduce((a, o) => a + orderTotalOf(o), 0);
  const monthStart = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); };
  const monthRevenue = deliveredSince(monthStart()).reduce((a, o) => a + orderTotalOf(o), 0);
  const goalPct = goal > 0 ? Math.min(100, Math.round((monthRevenue / goal) * 100)) : 0;
  const count = (k: string) => stats.find((x) => x.status === k)?.count ?? orders.filter((o) => o.status === k).length;

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const t = dayStart(new Date()) - (6 - i) * 86400000;
    const rev = orders.filter((o) => o.status === 'delivered' && dayStart(new Date(o.createdAt)) === t).reduce((a, o) => a + orderTotalOf(o), 0);
    return { t, rev, label: new Date(t).toLocaleDateString('ar-DZ', { weekday: 'narrow' }) };
  });
  const maxRev = Math.max(1, ...last7.map((d) => d.rev));

  const byWilaya = (() => {
    const map = new Map<string, number>();
    orders.filter((o) => o.status === 'delivered').forEach((o) => {
      const w = o.wilaya || 'غير محددة';
      map.set(w, (map.get(w) || 0) + orderTotalOf(o));
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  })();
  const maxWilaya = Math.max(1, ...byWilaya.map(([, v]) => v));

  const toggleHide = () => { const v = !hide; setHide(v); AsyncStorage.setItem(HIDE_KEY, v ? '1' : '0'); };
  const editGoal = () => {
    Alert.prompt('هدف مداخيل الشهر', 'أدخل الهدف بالدينار', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حفظ', onPress: (v?: string) => { const n = Number(v); if (n > 0) { setGoal(n); AsyncStorage.setItem(GOAL_KEY, String(n)); } } },
    ], 'plain-text', String(goal), 'numeric');
  };

  if (loading) return <View style={[s.screen, { justifyContent: 'center' }]}><ActivityIndicator size="large" color={C.accent} /></View>;
  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.content, { paddingTop: top, paddingBottom: BOTTOM_PAD }]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.accent} />}>
      <GlassGlow />
      <View style={[s.row, { justifyContent: 'space-between' }]}>
        <View>
          <Text style={s.h1}>الأرباح</Text>
          <Text style={s.sub}>المبيعات والمداخيل من الطلبات المُسلّمة</Text>
        </View>
        <Pressable onPress={toggleHide} style={{ backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: 'rgba(41,45,50,0.12)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 }}>
          <Text style={{ color: C.label, fontWeight: '600', fontSize: 13 }}>{hide ? 'إظهار' : 'إخفاء'}</Text>
        </Pressable>
      </View>

      <Card style={{ gap: 8 }}>
        <Text style={s.sub}>مبيعات اليوم</Text>
        <Text style={[s.h2, { fontSize: 30, color: '#2E4B38' }]}>{hide ? '••••••' : <AnimNum value={revenueIn(1)} format={(n) => dzd(n)} />}</Text>
        <View style={[s.row, { justifyContent: 'space-between' }]}>
          <Text style={s.sub}>آخر 7 أيام: <Text style={{ color: C.label, fontWeight: '600' }}>{money(revenueIn(7))}</Text></Text>
          <Text style={s.sub}>آخر 30 يوماً: <Text style={{ color: C.label, fontWeight: '600' }}>{money(revenueIn(30))}</Text></Text>
        </View>
      </Card>

      <Card style={{ gap: 10 }}>
        <Text style={s.h2}>مداخيل آخر 7 أيام</Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 84, gap: 6 }}>
          {last7.map((d) => (
            <View key={d.t} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              <GrowBar height={(d.rev / maxRev) * 58} color={d.rev > 0 ? '#829A89' : 'rgba(41,45,50,0.10)'} />
              <Text style={[s.sub, { fontSize: 10.5 }]}>{d.label}</Text>
            </View>
          ))}
        </View>
        <View style={{ height: 0.5, backgroundColor: C.hairline }} />
        <View style={{ gap: 6 }}>
          <View style={[s.row, { justifyContent: 'space-between' }]}>
            <Text style={s.sub}>هدف الشهر: {money(monthRevenue)} من {money(goal)} ({goalPct}%)</Text>
            <Pressable onPress={editGoal}><Text style={[s.sub, { color: '#5E7A68', fontWeight: '700' }]}>تعديل</Text></Pressable>
          </View>
          <Bar pct={goalPct} color="#829A89" />
        </View>
      </Card>

      {byWilaya.length > 0 ? (
        <Card style={{ gap: 12 }}>
          <Text style={s.h2}>أفضل الولايات (مداخيل مُسلّمة)</Text>
          {byWilaya.map(([w, v]) => (
            <View key={w} style={{ gap: 5 }}>
              <View style={[s.row, { justifyContent: 'space-between' }]}>
                <Text style={[s.txt, { fontWeight: '600', fontSize: 14 }]}>{w}</Text>
                <Text style={s.sub}>{money(v)}</Text>
              </View>
              <Bar pct={Math.round((v / maxWilaya) * 100)} color="#8294A8" />
            </View>
          ))}
        </Card>
      ) : null}

      <Card style={{ gap: 12 }}>
        <Text style={s.h2}>الطلبات حسب الحالة</Text>
        {ALL_STATUSES.filter((k) => count(k) > 0).map((k) => (
          <View key={k} style={[s.row, { justifyContent: 'space-between' }]}>
            <StatusPill status={k} />
            <Text style={[s.txt, { fontWeight: '600' }]}>{count(k)}</Text>
          </View>
        ))}
      </Card>

      <Text style={[s.sub, { textAlign: 'center' }]}>ملاحظة: الأرقام مبيعات ومداخيل محققة — الربح الصافي يحتاج تكلفة كل طلب، وهي غير مسجلة في النظام.</Text>
    </ScrollView>
  );
}
