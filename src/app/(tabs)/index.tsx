import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Image, ImageBackground, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { SymbolView } from 'expo-symbols';
import { ALL_STATUSES, api, dzd, orderTotalOf, relTime, STATUS_COLOR, STATUS_LABEL } from '../../lib/api';
import { Bar, GrowBar, BOTTOM_PAD, C, Card, FadeIn, HERO_LIGHT, s, Skeleton, SoftIcon, Sparkline, useTopPad } from '../../components/ui';
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

  const last7rev = Array.from({ length: 7 }, (_, i) => deliveredOn(dayStart(new Date()) - (6 - i) * 86400000).reduce((a, o) => a + orderTotalOf(o), 0));
  const ordersYest = orders.filter((o) => dayStart(new Date(o.createdAt)) === dayStart(new Date()) - 86400000).length;
  const ordDelta = ordersYest > 0 ? Math.round(((newToday - ordersYest) / ordersYest) * 100) : null;
  const nowMs = Date.now();
  const rev30 = orders.filter((o) => o.status === 'delivered' && nowMs - new Date(o.createdAt).getTime() < 30 * 86400000).reduce((a, o) => a + orderTotalOf(o), 0);
  const revPrev30 = orders.filter((o) => o.status === 'delivered' && nowMs - new Date(o.createdAt).getTime() >= 30 * 86400000 && nowMs - new Date(o.createdAt).getTime() < 60 * 86400000).reduce((a, o) => a + orderTotalOf(o), 0);
  const revDelta = revPrev30 > 0 ? Math.round(((rev30 - revPrev30) / revPrev30) * 100) : null;
  const unreach = count('unreachable');
  const attention = (newCount > 0 ? 1 : 0) + (unreach > 0 ? 1 : 0) + (lowStock > 0 ? 1 : 0) + (abandoned > 0 ? 1 : 0);
  const editGoal = () => Alert.prompt('الهدف الشهري', 'هدف مبيعات هذا الشهر (دج)', [
    { text: 'إلغاء', style: 'cancel' },
    { text: 'حفظ', onPress: (v?: string) => { const n = Number(v); if (n > 0) { setGoal(n); AsyncStorage.setItem(GOAL_KEY, String(n)); } } },
  ], 'plain-text', String(goal), 'number-pad');

  const Delta = ({ v, light }: { v: number | null; light?: boolean }) => v === null ? null : (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: light ? 'rgba(255,255,255,0.16)' : 'rgba(130,152,137,0.14)', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2.5, alignSelf: 'flex-start' }}>
      <SymbolView name={v >= 0 ? 'arrow.up.right' : 'arrow.down.right'} size={9} tintColor={light ? '#BFE3C8' : '#5F7A68'} />
      <Text style={{ color: light ? '#D8F2DE' : '#5F7A68', fontSize: 11.5, fontWeight: '700' }}>{Math.abs(v)}%</Text>
    </View>
  );
  const AttRow = ({ icon, tint, color, title, sub, n, route, idx }: any) => (
    <FadeIn index={idx}>
      <Pressable onPress={() => router.push(route)}>
        <Card style={{ padding: 12 }}>
          <View style={s.row}>
            <SoftIcon name={icon} tint={tint} color={color} size={40} circle glyph={17} />
            <View style={{ flex: 1, gap: 1 }}>
              <Text style={[s.txt, { fontWeight: '600', fontSize: 14.5 }]}>{title}</Text>
              <Text style={[s.sub, { fontSize: 12 }]}>{sub}</Text>
            </View>
            <Text style={[s.txt, { fontWeight: '800', fontSize: 16 }]}>{n}</Text>
            <Text style={{ color: C.tertiary, fontSize: 18 }}>{'‹'}</Text>
          </View>
        </Card>
      </Pressable>
    </FadeIn>
  );
  const Tile = ({ icon, tint, color, label, route }: any) => (
    <Pressable onPress={() => router.push(route)} style={({ pressed }) => ({ flex: 1, transform: [{ scale: pressed ? 0.96 : 1 }] })}>
      <Card style={{ padding: 12, alignItems: 'center', gap: 8 }}>
        <SoftIcon name={icon} tint={tint} color={color} size={44} radius={14} glyph={19} />
        <Text style={[s.txt, { fontWeight: '600', fontSize: 12.5, textAlign: 'center' }]}>{label}</Text>
      </Card>
    </Pressable>
  );

  if (loading) return (
    <View style={[s.screen, { paddingTop: top, paddingHorizontal: 16, gap: 12 }]}>
      <Skeleton height={200} radius={26} />
      <Skeleton height={104} radius={22} />
      <Skeleton height={130} radius={22} />
    </View>
  );
  return (
    <ScrollView style={s.screen} contentContainerStyle={{ paddingBottom: BOTTOM_PAD }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.accent} />}>
      <ImageBackground source={HERO_LIGHT} resizeMode="cover" style={{ paddingTop: top, paddingHorizontal: 16, paddingBottom: 18 }}>
        <FadeIn index={0}>
          <View style={s.row}>
            {store?.logoUrl ? <Image source={{ uri: store.logoUrl }} style={{ width: 46, height: 46, borderRadius: 999, borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)' }} /> : null}
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#4A4F4C', fontSize: 13, fontWeight: '600', textAlign: 'right' }}>{greeting}</Text>
              <Text style={{ color: '#292D30', fontSize: 19, fontWeight: '800', textAlign: 'right' }}>{store?.name || 'متجري'}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ color: '#5A5E58', fontSize: 12, textAlign: 'right' }}>تمنياتنا لك بيوم مليء بالنجاح</Text>
                <SymbolView name="leaf.fill" size={11} tintColor="#829889" />
              </View>
            </View>
            <Pressable onPress={() => router.push('/(tabs)/orders?filter=new' as any)}>
              <View style={{ width: 40, height: 40, borderRadius: 999, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.7)' }}>
                <BlurView intensity={60} tint="light" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.45)' }} />
                <SymbolView name="bell.fill" size={17} tintColor="#292D30" />
                {newCount > 0 ? <View style={{ position: 'absolute', top: 8, right: 9, width: 8, height: 8, borderRadius: 99, backgroundColor: '#BE8D8D', borderWidth: 1.2, borderColor: '#fff' }} /> : null}
              </View>
            </Pressable>
          </View>
        </FadeIn>
        <FadeIn index={1}>
          <View style={{ marginTop: 14, borderRadius: 26, overflow: 'hidden', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.35)' }}>
            <BlurView intensity={42} tint="dark" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
            <View style={{ backgroundColor: 'rgba(33,40,36,0.42)', padding: 18, gap: 10 }}>
              <View style={s.row}>
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12.5, fontWeight: '600', flex: 1, textAlign: 'right' }}>مبيعات اليوم</Text>
                <Pressable onPress={toggleHide} hitSlop={8}>
                  <SymbolView name={hide ? 'eye.slash.fill' : 'eye.fill'} size={16} tintColor="rgba(255,255,255,0.85)" />
                </Pressable>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 30, fontWeight: '800', textAlign: 'right' }}>{money(todayRev)}</Text>
                <Delta v={vsYest} light />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <Pressable onPress={editGoal} style={{ gap: 5 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, textAlign: 'right' }}>الهدف الشهري · {goalPct}%</Text>
                  <View style={{ width: 118, height: 5, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' }}>
                    <View style={{ width: `${goalPct}%`, height: 5, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.92)' }} />
                  </View>
                  <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10.5, textAlign: 'right' }}>{money(monthRevenue)} من {money(goal)}</Text>
                </Pressable>
                <Sparkline data={last7rev} />
              </View>
            </View>
          </View>
        </FadeIn>
      </ImageBackground>

      <View style={{ paddingHorizontal: 16, paddingTop: 14, gap: 12 }}>
        {err ? <Text style={{ color: '#BE8D8D', fontSize: 13, textAlign: 'right' }}>{err}</Text> : null}
        <FadeIn index={2}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Card style={{ flex: 1, gap: 7 }}>
              <SoftIcon name="bag.fill" size={36} radius={11} glyph={16} />
              <Text style={[s.sub, { fontSize: 12 }]}>طلبات اليوم</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[s.txt, { fontSize: 22, fontWeight: '800' }]}>{newToday}</Text>
                <Delta v={ordDelta} />
              </View>
            </Card>
            <Card style={{ flex: 1, gap: 7 }}>
              <SoftIcon name="chart.line.uptrend.xyaxis" tint="rgba(130,149,167,0.15)" color="#5F7488" size={36} radius={11} glyph={16} />
              <Text style={[s.sub, { fontSize: 12 }]}>مبيعات ٣٠ يوماً</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[s.txt, { fontSize: 17, fontWeight: '800' }]}>{money(rev30)}</Text>
                <Delta v={revDelta} />
              </View>
            </Card>
          </View>
        </FadeIn>

        <FadeIn index={3}>
          <View style={[s.row, { paddingHorizontal: 2 }]}>
            <Text style={[s.h2, { flex: 1 }]}>يتطلب اهتمامك</Text>
            {attention > 0 ? <View style={{ backgroundColor: 'rgba(130,152,137,0.15)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}><Text style={{ color: '#5F7A68', fontWeight: '700', fontSize: 12 }}>{attention}</Text></View> : null}
          </View>
        </FadeIn>
        {newCount > 0 ? <AttRow idx={3} icon="phone.fill" tint="rgba(195,161,106,0.18)" color="#A5814C" title="طلبات بانتظار التأكيد" sub="طلبات جديدة تحتاج إلى تأكيد" n={newCount} route="/(tabs)/orders?filter=new" /> : null}
        {unreach > 0 ? <AttRow idx={4} icon="phone.down.fill" tint="rgba(190,141,141,0.16)" color="#A96F6F" title="عملاء لا يمكن الوصول إليهم" sub="أعد المحاولة أو راسلهم واتساب" n={unreach} route="/(tabs)/orders?filter=unreachable" /> : null}
        {lowStock > 0 ? <AttRow idx={5} icon="shippingbox.fill" tint="rgba(190,141,141,0.16)" color="#A96F6F" title="منتجات مخزونها منخفض" sub="راجع المخزون قبل نفادها" n={lowStock} route="/stock" /> : null}
        {abandoned > 0 ? <AttRow idx={6} icon="clock.fill" tint="rgba(195,161,106,0.18)" color="#A5814C" title="طلبات مهجورة" sub="سلال بدأها العملاء ولم تُكمل" n={abandoned} route="/abandoned" /> : null}
        {attention === 0 ? <FadeIn index={3}><Text style={[s.sub, { paddingHorizontal: 2 }]}>لا شيء يحتاج انتباهك الآن — كل شيء تحت السيطرة.</Text></FadeIn> : null}

        <FadeIn index={7}>
          <Text style={[s.h2, { paddingHorizontal: 2 }]}>إجراءات سريعة</Text>
        </FadeIn>
        <FadeIn index={8}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Tile icon="plus" label="طلب جديد" route="/order-new" />
            <Tile icon="shippingbox.fill" tint="rgba(130,149,167,0.15)" color="#5F7488" label="منتج جديد" route="/product-new" />
            <Tile icon="truck.box.fill" tint="rgba(195,161,106,0.16)" color="#A5814C" label="توصيل اليوم" route="/today" />
            <Tile icon="chart.bar.fill" label="التقارير" route="/(tabs)/profit" />
          </View>
        </FadeIn>

        <FadeIn index={9}>
          <View style={[s.row, { paddingHorizontal: 2 }]}>
            <Text style={[s.h2, { flex: 1 }]}>أحدث الطلبات</Text>
            <Pressable onPress={() => router.push('/(tabs)/orders' as any)}><Text style={{ color: '#5F7A68', fontWeight: '600', fontSize: 13 }}>عرض الكل {'‹'}</Text></Pressable>
          </View>
        </FadeIn>
        <FadeIn index={10}>
          <Card style={{ paddingVertical: 6 }}>
            {orders.slice(0, 5).map((o, i) => (
              <Pressable key={o.id} onPress={() => router.push(`/order/${o.id}` as any)}>
                <View style={[s.row, { paddingVertical: 10, borderBottomWidth: i < 4 ? 0.5 : 0, borderBottomColor: C.hairline }]}>
                  <SoftIcon name="bag.fill" tint="#EFEDE7" color="#8A8F87" size={40} radius={12} glyph={16} />
                  <View style={{ flex: 1, gap: 1 }}>
                    <Text style={[s.txt, { fontWeight: '600', fontSize: 13.5 }]}>{o.customerName}</Text>
                    <Text style={[s.sub, { fontSize: 11.5 }]}>{relTime(o.createdAt)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 1 }}>
                    <Text style={[s.txt, { fontWeight: '700', fontSize: 13.5 }]}>{money(orderTotalOf(o))}</Text>
                    <Text style={{ color: STATUS_COLOR[o.status] || '#9CA1A6', fontSize: 11, fontWeight: '600' }}>{STATUS_LABEL[o.status] || o.status}</Text>
                  </View>
                </View>
              </Pressable>
            ))}
            {orders.length === 0 ? <Text style={[s.sub, { paddingVertical: 10 }]}>لا توجد طلبات بعد.</Text> : null}
          </Card>
        </FadeIn>

        <FadeIn index={11}>
          <Card style={{ gap: 10 }}>
            <Text style={s.h2}>أداء آخر ٧ أيام</Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 74, gap: 4 }}>
              {last7.map((d, i) => (
                <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                  <Text style={{ color: C.secondary, fontSize: 10.5, fontWeight: '600' }}>{d.n || ''}</Text>
                  <GrowBar height={(d.n / maxDay) * 44} color={d.n > 0 ? '#829889' : 'rgba(41,45,48,0.10)'} />
                  <Text style={{ color: C.secondary, fontSize: 10.5 }}>{d.label}</Text>
                </View>
              ))}
            </View>
            <View style={{ height: 0.5, backgroundColor: C.hairline }} />
            {ALL_STATUSES.filter((k) => count(k) > 0).slice(0, 4).map((k) => (
              <View key={k} style={[s.row, { gap: 8 }]}>
                <Text style={[s.sub, { width: 86, fontSize: 12 }]}>{STATUS_LABEL[k]}</Text>
                <View style={{ flex: 1 }}><Bar pct={total ? (count(k) / total) * 100 : 0} color={STATUS_COLOR[k]} /></View>
                <Text style={[s.txt, { fontWeight: '700', fontSize: 13 }]}>{count(k)}</Text>
              </View>
            ))}
          </Card>
        </FadeIn>
      </View>
    </ScrollView>
  );
}
