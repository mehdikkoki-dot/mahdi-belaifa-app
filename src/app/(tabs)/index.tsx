import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { api, dzd, fmtDate } from '../../lib/api';
import { C, Card, s, StatusPill } from '../../components/ui';

export default function Dashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    try {
      const [st, or] = await Promise.all([api.stats(), api.orders()]);
      setStats(Array.isArray(st) ? st : []);
      setOrders(Array.isArray(or) ? or : []);
      setErr('');
    } catch (e: any) { setErr('تعذر تحميل البيانات'); }
    setLoading(false); setRefreshing(false);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const count = (k: string) => stats.find((x) => x.status === k)?.count ?? orders.filter((o) => o.status === k).length;
  const total = stats.reduce((a, x) => a + (x.count || 0), 0) || orders.length;
  const revenue = orders.filter((o) => o.status !== 'cancelled').reduce((a, o) => a + (Number(o.price) || 0), 0);

  const Stat = ({ title, value, color }: { title: string; value: string; color?: string }) => (
    <Card style={{ flex: 1 }}>
      <Text style={[s.h2, { color: color || C.label, fontSize: 22 }]}>{value}</Text>
      <Text style={s.sub}>{title}</Text>
    </Card>
  );

  if (loading) return <View style={[s.screen, { justifyContent: 'center' }]}><ActivityIndicator size="large" color={C.accent} /></View>;
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.accent} />}>
      <Text style={s.h1}>الرئيسية</Text>
      {err ? <Text style={[s.sub, { color: '#F2A199' }]}>{err}</Text> : null}
      <View style={s.row}>
        <Stat title="مجموع الطلبات" value={String(total)} />
        <Stat title="بانتظار التأكيد" value={String(count('new'))} color="#A68CFA" />
      </View>
      <View style={s.row}>
        <Stat title="تم توصيلها" value={String(count('delivered'))} color="#59D98C" />
        <Stat title="المداخيل" value={dzd(revenue)} />
      </View>
      <Text style={s.h2}>أحدث الطلبات</Text>
      {orders.slice(0, 5).map((o) => (
        <Pressable key={o.id} onPress={() => router.push(`/order/${o.id}` as any)}>
          <Card>
            <View style={s.row}>
              <View style={s.grow}>
                <Text style={s.txt}>{o.customerName || '—'}</Text>
                <Text style={s.sub}>{o.orderNumber || ''} · {fmtDate(o.createdAt)}</Text>
              </View>
              <StatusPill status={o.status} />
              <Text style={[s.txt, { fontWeight: '700' }]}>{dzd(o.codAmount ?? o.price)}</Text>
            </View>
          </Card>
        </Pressable>
      ))}
      {orders.length === 0 && !err ? <Text style={s.sub}>لا توجد طلبات بعد.</Text> : null}
    </ScrollView>
  );
}
