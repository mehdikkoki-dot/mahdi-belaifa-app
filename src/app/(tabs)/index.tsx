import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { ALL_STATUSES, api, dzd, orderTotalOf, relTime, STATUS_COLOR } from '../../lib/api';
import { AnimNum, Bar, BOTTOM_PAD, C, Card, GlassGlow, s, StatusPill, useTopPad } from '../../components/ui';
import { loadCache, saveCache } from '../../lib/cache';

const GOAL_KEY = 'monthlyGoal';
const HIDE_KEY = 'hideMoney';

export default function Dashboard() {
  const router = useRouter();
  const top = useTopPad();
  const [stats, setStats] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [store, setStore] = useState<any>(null);
  const [abandoned, setAbandoned] = useState(0);
  const [lowStock, setLowStock] = useState(0);
  const [goal, setGoal] = useState(100000);
  const [hide, setHide] = useState(false);
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
    api.abandonedStats().then((a: any) => setAbandoned(a?.total ?? a?.count ?? 0)).catch(() => {});
    api.stock().then((sk: any) => setLowStock((sk?.lowStockCount ?? 0) + (sk?.outOfStockCount ?? 0))).catch(() => {});
    AsyncStorage.getItem(GOAL_KEY).then((g) => { if (g) setGoal(Number(g) || 100000); }).catch(() => {});
    AsyncStorage.getItem(HIDE_KEY).then((h) => setHide(h === '1')).catch(() => {});
    setLoading(false); setRefreshing(false);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const count = (k: string) => stats.find((x) => x.status === k)?.count ?? orders.filter((o) => o.status === k).length;
  const total = ALL_STATUSES.reduce((a, k) => a + (count(k) || 0), 0);
  const money = (n: number) => (hide ? '••••••' : dzd(n));
  const toggleHide = () => { const v = !hide; setHide(v); AsyncStorage.setItem(HIDE_KEY, v ? '1' : '0'); };

  const dayStart = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); };
  const deliveredOn = (t: number) => orders.filter((o) => o.status === 'delivered' && dayStart(new Date(o.createdAt)) === t);
  const todayRev = deliveredOn(dayStart(new Date())).reduce((a, o) => a + orderTotalOf(o), 0);
  const yestRev = deliveredOn(dayStart(new Date()) - 86400000).reduce((a, o) => a + orderTotalOf(o), 0);
  const vsYest = yestRev > 0 ? Math.round(((todayRev - yestRev) / yestRev) * 100) : null;
  const monthStart = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); };
  const monthRevenue = orders.filter((o) => o.status === 'delivered' && new Date(o.createdAt).getTime() >= monthStart()).reduce((a, o) => a + orderTotalOf(o), 0);
  const goalPct = goal > 0 ? Math.min(100, Math.round((monthRevenue / goal) * 100)) : 0;
  const newToday = orders.filter((o) => dayStart(new Date(o.createdAt)) === dayStart(new Date())).length;
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const t = dayStart(new Date()) - (6 - i) * 86400000;
    return { t, n: orders.filter((o) => dayStart(new Date(o.createdAt)) === t).length, label: new Date(t).toLocaleDateString('ar-DZ', { weekday: 'narrow' }) };
  });
  const maxDay = Math.max(1, ...last7.map((d) => d.n));
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'صباح الخير' : 'مساء الخير';
  const newCount = count('new');

  const ActionRow = ({ dot, label, n, route, last }: { dot: string; label: string; n: number; route: string; last?: boolean }) => (
    <Pressable onPress={() => router.push(route as any)}>
      <View style={[s.row, { paddingVertical: 11, borderBottomWidth: last ? 0 : 0.5, borderBottomColor: C.hairline }]}>
        <View style={{ width: 9, height: 9, borderRadius: 99, backgroundColor: dot }} />
        <Text style={[s.txt, { flex: 1, fontWeight: '500' }]}>{label}</Text>
        <Text style={[s.txt, { fontWeight: '700' }]}>{n}</Text>
        <Text style={{ color: C.tertiary, fontSize: 18 }}>{'‹'}</Text>
      </View>
    </Pressable>
  );
  const QuickTile = ({ title, sub, route }: { title: string; sub: string; route: string }) => (
    <Pressable onPress={() => router.push(route as any)} style={({ pressed }) => ({ flex: 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
      <Card style={{ gap: 2 }}>
        <Text style={[s.txt, { fontWeight: '600', fontSize: 15 }]}>{title}</Text>
        <Text style={s.sub}>{sub}</Text>
      </Card>
    </Pressable>
  );

  if (loading) return <View style={[s.screen, { justifyContent: 'center' }]}><ActivityIndicator size="large" color={C.accent} /></View>;
  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.content, { paddingTop: top, paddingBottom: BOTTOM_PAD }]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.accent} />}>
      <GlassGlow />

      {/* A. Header */}
      <View style={[s.row, { gap: 12 }]}>
        {store?.logoUrl ? <Image source={{ uri: store.logoUrl }} style={{ width: 54, height: 54, borderRadius: 16 }} /> : null}
        <View style={s.grow}>
          <Text style={s.sub}>{greeting}،</Text>
          <Text style={[s.h1, { fontSize: 23 }]}>{store?.name || 'Mahdi Belaifa'}</Text>
        </View>
        <Pressable onPress={() => router.push('/(tabs)/orders?filter=new' as any)} style={{ width: 44, height: 44, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: 'rgba(41,45,50,0.12)', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 19 }}>🔔</Text>
          {newCount > 0 ? <View style={{ position: 'absolute', top: 9, end: 10, width: 9, height: 9, borderRadius: 99, backgroundColor: '#C58F8F', borderWidth: 1.5, borderColor: '#F5F4F0' }} /> : null}
        </Pressable>
      </View>
      {err ? <Text style={[s.sub, { color: '#A85F5F' }]}>{err}</Text> : null}

      {/* B. Financial overview */}
      <Card style={{ gap: 8 }}>
        <View style={[s.row, { justifyContent: 'space-between' }]}>
          <Text style={s.sub}>مبيعات اليوم (طلبات مُسلّمة)</Text>
          <Pressable onPress={toggleHide}><Text style={[s.sub, { color: '#5E7A68', fontWeight: '700' }]}>{hide ? 'إظهار' : 'إخفاء'}</Text></Pressable>
        </View>
        <Text style={[s.h2, { fontSize: 30, color: '#292D32' }]}>{hide ? '••••••' : <AnimNum value={todayRev} format={(n) => dzd(n)} />}</Text>
        <View style={[s.row, { justifyContent: 'space-between' }]}>
          <Text style={s.sub}>طلبات جديدة اليوم: <Text style={{ color: C.label, fontWeight: '600' }}>{newToday}</Text></Text>
          {vsYest !== null ? <Text style={[s.sub, { color: vsYest >= 0 ? '#5E8A6C' : '#A85F5F', fontWeight: '700' }]}>{vsYest >= 0 ? '▲' : '▼'} {Math.abs(vsYest)}% مقارنة بالأمس</Text> : <Text style={s.sub}>لا مقارنة متاحة</Text>}
        </View>
        <View style={{ height: 0.5, backgroundColor: C.hairline }} />
        <View style={{ gap: 6 }}>
          <Text style={s.sub}>هدف الشهر: {money(monthRevenue)} من {money(goal)} ({goalPct}%)</Text>
          <Bar pct={goalPct} color="#829A89" />
        </View>
      </Card>

      {/* C. Action required */}
      <Text style={s.h2}>يحتاج انتباهك</Text>
      <Card style={{ paddingVertical: 2 }}>
        <ActionRow dot="#8294A8" label="طلبات بانتظار التأكيد" n={newCount} route="/(tabs)/orders?filter=new" />
        <ActionRow dot="#C7A46A" label="عملاء لا يمكن الوصول إليهم" n={count('unreachable')} route="/(tabs)/orders?filter=unreachable" />
        <ActionRow dot="#C58F8F" label="طلبات مهجورة" n={abandoned} route="/abandoned" />
        <ActionRow dot="#C7A46A" label="منتجات مخزونها منخفض" n={lowStock} route="/stock" last />
      </Card>

      {/* D. Quick actions */}
      <Text style={s.h2}>إجراءات سريعة</Text>
      <View style={s.row}>
        <QuickTile title="طلب جديد" sub="إنشاء طلب يدوياً" route="/order-new" />
        <QuickTile title="منتج جديد" sub="إضافة للكتالوج" route="/product-new" />
      </View>
      <View style={s.row}>
        <QuickTile title="التوصيل" sub="الشركات والسائقون" route="/delivery" />
        <QuickTile title="التقارير" sub="الأرباح والمداخيل" route="/(tabs)/profit" />
      </View>

      {/* E. Recent orders */}
      <View style={[s.row, { justifyContent: 'space-between' }]}>
        <Text style={s.h2}>أحدث الطلبات</Text>
        <Pressable onPress={() => router.push('/(tabs)/orders' as any)}>
          <Text style={[s.sub, { color: '#5E7A68', fontWeight: '700' }]}>عرض الكل</Text>
        </Pressable>
      </View>
      <Card style={{ paddingVertical: 2 }}>
        {orders.slice(0, 5).map((o, i) => (
          <Pressable key={o.id} onPress={() => router.push(`/order/${o.id}` as any)}>
            <View style={{ paddingVertical: 10, borderBottomWidth: i < Math.min(4, orders.length - 1) ? 0.5 : 0, borderBottomColor: C.hairline, gap: 5 }}>
              <View style={s.row}>
                <View style={s.grow}>
                  <Text style={[s.txt, { fontWeight: '600' }]}>{o.orderNumber || ''}</Text>
                  <Text style={s.sub}>{o.customerName || '—'}</Text>
                </View>
                <StatusPill status={o.status} />
              </View>
              <View style={[s.row, { justifyContent: 'space-between' }]}>
                <Text style={[s.txt, { fontWeight: '600' }]}>{money(orderTotalOf(o))}</Text>
                <Text style={s.sub}>{relTime(o.createdAt)}</Text>
              </View>
            </View>
          </Pressable>
        ))}
        {orders.length === 0 ? <Text style={[s.sub, { paddingVertical: 10 }]}>لا توجد طلبات بعد.</Text> : null}
      </Card>

      {/* F. Performance */}
      <Text style={s.h2}>الأداء</Text>
      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 72, gap: 6 }}>
          {last7.map((d) => (
            <View key={d.t} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              <View style={{ width: '70%', height: Math.max(4, (d.n / maxDay) * 48), borderRadius: 6, backgroundColor: d.n > 0 ? '#829A89' : 'rgba(41,45,50,0.10)' }} />
              <Text style={[s.sub, { fontSize: 10.5 }]}>{d.label}</Text>
            </View>
          ))}
        </View>
        <Text style={[s.sub, { textAlign: 'center' }]}>طلبات آخر 7 أيام · المجموع {total} · مُسلّمة {count('delivered')} · مرتجعة {count('returned')}</Text>
        <View style={{ height: 0.5, backgroundColor: C.hairline }} />
        {ALL_STATUSES.filter((k) => count(k) > 0).map((k) => {
          const c = count(k) || 0;
          const pct = total > 0 ? Math.round((c / total) * 100) : 0;
          return (
            <View key={k} style={[s.row, { gap: 10 }]}>
              <View style={{ width: 110 }}><StatusPill status={k} /></View>
              <Bar pct={pct} color={STATUS_COLOR[k]} />
              <Text style={[s.sub, { color: C.label, fontWeight: '600', width: 52, textAlign: 'left' }]}>{c} · {pct}%</Text>
            </View>
          );
        })}
      </Card>
    </ScrollView>
  );
}
