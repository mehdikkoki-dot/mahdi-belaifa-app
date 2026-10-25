import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { ALL_STATUSES, api, dzd, IN_PROGRESS, orderTotalOf, relTime, STATUS_COLOR } from '../../lib/api';
import { AnimNum, Bar, BOTTOM_PAD, C, Card, GlassButton, GlassGlow, s, StatusPill, useTopPad } from '../../components/ui';
import { loadCache, saveCache } from '../../lib/cache';

const GOAL_KEY = 'monthlyGoal';

export default function Dashboard() {
  const router = useRouter();
  const top = useTopPad();
  const [stats, setStats] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [store, setStore] = useState<any>(null);
  const [attention, setAttention] = useState<{ abandoned: number; lowStock: number }>({ abandoned: 0, lowStock: 0 });
  const [goal, setGoal] = useState(100000);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    try {
      const [st, or] = await Promise.all([api.stats(), api.orders()]);
      setStats(Array.isArray(st) ? st : []);
      setOrders(Array.isArray(or) ? or : []);
      setErr('');
      saveCache('dashboard', { stats: st, orders: or });
    } catch {
      const cached = await loadCache('dashboard');
      if (cached) { setStats(cached.stats || []); setOrders(cached.orders || []); setErr('أنت غير متصل — تُعرض آخر بيانات محفوظة'); }
      else setErr('تعذر تحميل البيانات');
    }
    api.store().then(setStore).catch(() => {});
    api.abandonedStats().then((a: any) => setAttention((p) => ({ ...p, abandoned: a?.total ?? a?.count ?? 0 }))).catch(() => {});
    api.stock().then((sk: any) => setAttention((p) => ({ ...p, lowStock: (sk?.lowStockCount ?? 0) + (sk?.outOfStockCount ?? 0) }))).catch(() => {});
    AsyncStorage.getItem(GOAL_KEY).then((g) => { if (g) setGoal(Number(g) || 100000); }).catch(() => {});
    setLoading(false); setRefreshing(false);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const count = (k: string) => stats.find((x) => x.status === k)?.count ?? orders.filter((o) => o.status === k).length;
  const total = ALL_STATUSES.reduce((a, k) => a + (count(k) || 0), 0);
  const active = IN_PROGRESS.reduce((a, k) => a + (count(k) || 0), 0);

  const dayStart = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); };
  const deliveredSince = (fromMs: number) => orders.filter((o) => o.status === 'delivered' && new Date(o.createdAt).getTime() >= fromMs);
  const revenueIn = (days: number) => deliveredSince(dayStart(new Date()) - (days - 1) * 86400000).reduce((a, o) => a + orderTotalOf(o), 0);
  const monthStart = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); };
  const monthRevenue = deliveredSince(monthStart()).reduce((a, o) => a + orderTotalOf(o), 0);
  const goalPct = goal > 0 ? Math.min(100, Math.round((monthRevenue / goal) * 100)) : 0;
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const t = dayStart(new Date()) - (6 - i) * 86400000;
    return { t, n: orders.filter((o) => dayStart(new Date(o.createdAt)) === t).length, label: new Date(t).toLocaleDateString('ar-DZ', { weekday: 'narrow' }) };
  });
  const maxDay = Math.max(1, ...last7.map((d) => d.n));

  const editGoal = () => {
    Alert.prompt('هدف مداخيل الشهر', 'أدخل الهدف بالدينار', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حفظ', onPress: (v?: string) => { const n = Number(v); if (n > 0) { setGoal(n); AsyncStorage.setItem(GOAL_KEY, String(n)); } } },
    ], 'plain-text', String(goal), 'numeric');
  };

  const Tile = ({ title, sub, route }: { title: string; sub: string; route: string }) => (
    <Pressable onPress={() => router.push(route as any)} style={({ pressed }) => ({ flex: 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
      <Card style={{ alignItems: 'flex-start', gap: 2 }}>
        <Text style={[s.txt, { fontWeight: '700', fontSize: 15.5 }]}>{title}</Text>
        <Text style={s.sub}>{sub}</Text>
      </Card>
    </Pressable>
  );

  if (loading) return <View style={[s.screen, { justifyContent: 'center' }]}><ActivityIndicator size="large" color={C.accent} /></View>;
  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.content, { paddingTop: top, paddingBottom: BOTTOM_PAD }]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.accent} />}>
      <GlassGlow />

      <View style={[s.row, { gap: 12 }]}>
        {store?.logoUrl ? <Image source={{ uri: store.logoUrl }} style={{ width: 56, height: 56, borderRadius: 16 }} /> : null}
        <View style={s.grow}>
          <Text style={[s.h1, { fontSize: 24 }]}>{store?.name || 'Mahdi Belaifa'}</Text>
          <Text style={s.sub}>لوحة التحكم — SOUR</Text>
        </View>
      </View>

      <GlassButton title="+ طلب جديد" variant="primary" onPress={() => router.push('/order-new' as any)} />
      {err ? <Text style={[s.sub, { color: '#F2A199' }]}>{err}</Text> : null}

      <Card style={{ gap: 10 }}>
        <Text style={s.sub}>مداخيل اليوم (المُسلّمة)</Text>
        <Text style={[s.h2, { color: '#59D98C', fontSize: 32 }]}><AnimNum value={revenueIn(1)} format={(n) => dzd(n)} /></Text>
        <View style={[s.row, { justifyContent: 'space-between' }]}>
          <Text style={s.sub}>آخر 7 أيام: <Text style={{ color: C.label, fontWeight: '700' }}>{dzd(revenueIn(7))}</Text></Text>
          <Text style={s.sub}>آخر 30 يوماً: <Text style={{ color: C.label, fontWeight: '700' }}>{dzd(revenueIn(30))}</Text></Text>
        </View>
        <View style={{ height: 0.5, backgroundColor: C.hairline }} />
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 76, gap: 6 }}>
          {last7.map((d) => (
            <View key={d.t} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              <Text style={[s.sub, { fontSize: 10.5 }]}>{d.n > 0 ? String(d.n) : ''}</Text>
              <View style={{ width: '70%', height: Math.max(4, (d.n / maxDay) * 50), borderRadius: 6, backgroundColor: d.n > 0 ? C.accent : 'rgba(255,255,255,0.10)' }} />
              <Text style={[s.sub, { fontSize: 10.5 }]}>{d.label}</Text>
            </View>
          ))}
        </View>
        <View style={{ height: 0.5, backgroundColor: C.hairline }} />
        <View style={{ gap: 6 }}>
          <View style={[s.row, { justifyContent: 'space-between' }]}>
            <Text style={s.sub}>هدف الشهر: {dzd(monthRevenue)} من {dzd(goal)}</Text>
            <Pressable onPress={editGoal}><Text style={[s.sub, { color: '#8AB5F7', fontWeight: '700' }]}>تعديل الهدف</Text></Pressable>
          </View>
          <Bar pct={goalPct} color="#59D98C" />
        </View>
      </Card>

      <Text style={s.h2}>يحتاج انتباهك</Text>
      <View style={s.row}>
        <Pressable onPress={() => router.push('/(tabs)/orders' as any)} style={{ flex: 1 }}>
          <Card style={{ alignItems: 'center', gap: 2 }}>
            <Text style={[s.h2, { fontSize: 22, color: '#F5BF91' }]}><AnimNum value={count('new')} /></Text>
            <Text style={s.sub}>طلبات جديدة</Text>
          </Card>
        </Pressable>
        <Pressable onPress={() => router.push('/abandoned' as any)} style={{ flex: 1 }}>
          <Card style={{ alignItems: 'center', gap: 2 }}>
            <Text style={[s.h2, { fontSize: 22, color: '#F5BAB2' }]}><AnimNum value={attention.abandoned} /></Text>
            <Text style={s.sub}>مهجورة</Text>
          </Card>
        </Pressable>
        <Pressable onPress={() => router.push('/stock' as any)} style={{ flex: 1 }}>
          <Card style={{ alignItems: 'center', gap: 2 }}>
            <Text style={[s.h2, { fontSize: 22, color: '#F5C26B' }]}><AnimNum value={attention.lowStock} /></Text>
            <Text style={s.sub}>مخزون منخفض</Text>
          </Card>
        </Pressable>
      </View>

      <View style={s.row}>
        <Tile title="المنتجات" sub="الكتالوج والأسعار" route="/(tabs)/products" />
        <Tile title="العملاء" sub="قائمة العملاء" route="/(tabs)/customers" />
      </View>
      <View style={s.row}>
        <Tile title="توصيل اليوم" sub="طلبات جاهزة للخروج" route="/today" />
        <Tile title="بحث شامل" sub="طلبات، عملاء، منتجات" route="/search" />
      </View>

      <View style={[s.row, { justifyContent: 'space-between', marginTop: 2 }]}>
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

      <View style={s.row}>
        <Card style={{ flex: 1, alignItems: 'center', gap: 2 }}>
          <Text style={[s.h2, { fontSize: 20 }]}><AnimNum value={total} /></Text>
          <Text style={s.sub}>مجموع الطلبات</Text>
        </Card>
        <Card style={{ flex: 1, alignItems: 'center', gap: 2 }}>
          <Text style={[s.h2, { fontSize: 20, color: '#F5BF91' }]}><AnimNum value={active} /></Text>
          <Text style={s.sub}>قيد التنفيذ</Text>
        </Card>
        <Card style={{ flex: 1, alignItems: 'center', gap: 2 }}>
          <Text style={[s.h2, { fontSize: 20, color: '#59D98C' }]}><AnimNum value={count('delivered')} /></Text>
          <Text style={s.sub}>تم التوصيل</Text>
        </Card>
        <Card style={{ flex: 1, alignItems: 'center', gap: 2 }}>
          <Text style={[s.h2, { fontSize: 20, color: '#F5BAB2' }]}><AnimNum value={count('returned')} /></Text>
          <Text style={s.sub}>مرتجعات</Text>
        </Card>
      </View>

      <Text style={s.h2}>توزيع حالات الطلبات</Text>
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
