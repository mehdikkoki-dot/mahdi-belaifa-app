import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { ALL_STATUSES, api, dzd, IN_PROGRESS, orderTotalOf, relTime, STATUS_COLOR, STATUS_LABEL } from '../../lib/api';
import { AnimNum, Bar, BOTTOM_PAD, C, Card, s, StatusPill, useTopPad, GlassGlow } from '../../components/ui';
import { loadCache, saveCache } from '../../lib/cache';

export default function Dashboard() {
  const router = useRouter();
  const top = useTopPad();
  const [stats, setStats] = useState<any[]>([]);
  const [store, setStore] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    try {
      const [st, or] = await Promise.all([api.stats(), api.orders()]);
      api.store().then(setStore).catch(() => {});
      setStats(Array.isArray(st) ? st : []);
      setOrders(Array.isArray(or) ? or : []);
      setErr('');
      saveCache('dashboard', { stats: st, orders: or });
    } catch (e: any) {
      const cached = await loadCache('dashboard');
      if (cached) { setStats(cached.stats || []); setOrders(cached.orders || []); setErr('أنت غير متصل — تُعرض آخر بيانات محفوظة'); }
      else setErr('تعذر تحميل البيانات');
    }
    setLoading(false); setRefreshing(false);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const count = (k: string) => stats.find((x) => x.status === k)?.count ?? orders.filter((o) => o.status === k).length;
  const total = ALL_STATUSES.reduce((a, k) => a + (count(k) || 0), 0);
  const active = IN_PROGRESS.reduce((a, k) => a + (count(k) || 0), 0);

  const Stat = ({ title, value, color }: { title: string; value: number; color?: string }) => (
    <Card style={{ flex: 1 }}>
      <Text style={[s.h2, { color: color || C.label, fontSize: 24 }]}><AnimNum value={value} /></Text>
      <Text style={s.sub}>{title}</Text>
    </Card>
  );

  const dayStart = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); };
  const revenueIn = (days: number) => {
    const from = dayStart(new Date()) - (days - 1) * 86400000;
    return orders.filter((o) => o.status === 'delivered' && new Date(o.createdAt).getTime() >= from).reduce((a, o) => a + orderTotalOf(o), 0);
  };
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const t = dayStart(new Date()) - (6 - i) * 86400000;
    const dayOrders = orders.filter((o) => dayStart(new Date(o.createdAt)) === t);
    return { t, n: dayOrders.length, label: new Date(t).toLocaleDateString('ar-DZ', { weekday: 'narrow' }) };
  });
  const maxDay = Math.max(1, ...last7.map((d) => d.n));

  if (loading) return <View style={[s.screen, { justifyContent: 'center' }]}><ActivityIndicator size="large" color={C.accent} /></View>;
  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.content, { paddingTop: top, paddingBottom: BOTTOM_PAD }]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.accent} />}>
      <GlassGlow />
      <View style={[s.row, { gap: 12 }]}>
        {store?.logoUrl ? <Image source={{ uri: store.logoUrl }} style={{ width: 52, height: 52, borderRadius: 15 }} /> : null}
        <View style={s.grow}>
          <Text style={s.h1}>لوحة التحكم</Text>
          <Text style={s.sub}>{store?.name || 'Mahdi Belaifa'} — نظرة عامة على متجرك وطلباتك</Text>
        </View>
      </View>
      {err ? <Text style={[s.sub, { color: '#F2A199' }]}>{err}</Text> : null}

      <View style={s.row}>
        <Stat title="مجموع الطلبات" value={total} />
        <Stat title="طلبات قيد التنفيذ" value={active} color="#F5BF91" />
      </View>
      <View style={s.row}>
        <Stat title="تم التوصيل" value={count('delivered')} color="#59D98C" />
        <Stat title="المرتجعات" value={count('returned')} color="#F5BAB2" />
      </View>

      <Text style={[s.h2, { marginTop: 4 }]}>المداخيل (الطلبات المُسلّمة)</Text>
      <Card style={{ gap: 12 }}>
        <View style={[s.row, { justifyContent: 'space-between' }]}>
          <View style={{ alignItems: 'flex-end', gap: 2 }}>
            <Text style={[s.h2, { color: '#59D98C', fontSize: 20 }]}><AnimNum value={revenueIn(1)} format={(n) => dzd(n)} /></Text>
            <Text style={s.sub}>اليوم</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 2 }}>
            <Text style={[s.h2, { fontSize: 20 }]}><AnimNum value={revenueIn(7)} format={(n) => dzd(n)} /></Text>
            <Text style={s.sub}>آخر 7 أيام</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 2 }}>
            <Text style={[s.h2, { fontSize: 20 }]}><AnimNum value={revenueIn(30)} format={(n) => dzd(n)} /></Text>
            <Text style={s.sub}>آخر 30 يوماً</Text>
          </View>
        </View>
        <View style={{ height: 0.5, backgroundColor: C.hairline }} />
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 84, gap: 6 }}>
          {last7.map((d) => (
            <View key={d.t} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              <Text style={[s.sub, { fontSize: 10.5 }]}>{d.n > 0 ? String(d.n) : ''}</Text>
              <View style={{ width: '70%', height: Math.max(4, (d.n / maxDay) * 56), borderRadius: 6, backgroundColor: d.n > 0 ? C.accent : 'rgba(255,255,255,0.10)' }} />
              <Text style={[s.sub, { fontSize: 10.5 }]}>{d.label}</Text>
            </View>
          ))}
        </View>
        <Text style={[s.sub, { textAlign: 'center' }]}>عدد الطلبات في آخر 7 أيام</Text>
      </Card>

      <View style={[s.row, { justifyContent: 'space-between', marginTop: 4 }]}>
        <Text style={s.h2}>أحدث الطلبات</Text>
        <Pressable onPress={() => router.push('/(tabs)/orders' as any)}>
          <Text style={[s.sub, { color: '#8AB5F7', fontWeight: '600' }]}>عرض الكل</Text>
        </Pressable>
      </View>
      {orders.slice(0, 5).map((o) => (
        <Pressable key={o.id} onPress={() => router.push(`/order/${o.id}` as any)}>
          <Card>
            <View style={s.row}>
              <View style={s.grow}>
                <Text style={[s.txt, { fontWeight: '700' }]}>{o.orderNumber || ''}</Text>
                <Text style={s.sub}>{o.customerName || '—'}{o.productName ? ` · ${o.productName}` : ''}</Text>
              </View>
              <StatusPill status={o.status} />
            </View>
            <View style={[s.row, { justifyContent: 'space-between', marginTop: 8 }]}>
              <Text style={[s.txt, { fontWeight: '700' }]}>{dzd(orderTotalOf(o))}</Text>
              <Text style={s.sub}>{relTime(o.createdAt)}</Text>
            </View>
          </Card>
        </Pressable>
      ))}
      {orders.length === 0 && !err ? <Text style={s.sub}>لا توجد طلبات بعد.</Text> : null}

      <Text style={[s.h2, { marginTop: 4 }]}>توزيع حالات الطلبات</Text>
      <Card style={{ gap: 14 }}>
        {ALL_STATUSES.map((k) => {
          const c = count(k) || 0;
          const pct = total > 0 ? Math.round((c / total) * 100) : 0;
          return (
            <View key={k} style={{ gap: 6 }}>
              <View style={[s.row, { justifyContent: 'space-between' }]}>
                <StatusPill status={k} />
                <Text style={[s.sub, { color: C.label, fontWeight: '700' }]}>{c} · {pct}%</Text>
              </View>
              <Bar pct={pct} color={STATUS_COLOR[k]} />
            </View>
          );
        })}
        {total === 0 ? <Text style={s.sub}>لا توجد بيانات بعد.</Text> : null}
      </Card>
    </ScrollView>
  );
}
