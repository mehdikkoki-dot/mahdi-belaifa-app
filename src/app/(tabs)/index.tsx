import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { ALL_STATUSES, api, dzd, IN_PROGRESS, orderTotalOf, relTime, STATUS_COLOR, STATUS_LABEL } from '../../lib/api';
import { Bar, BOTTOM_PAD, C, Card, s, StatusPill, useTopPad } from '../../components/ui';

export default function Dashboard() {
  const router = useRouter();
  const top = useTopPad();
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
  const total = ALL_STATUSES.reduce((a, k) => a + (count(k) || 0), 0);
  const active = IN_PROGRESS.reduce((a, k) => a + (count(k) || 0), 0);

  const Stat = ({ title, value, color }: { title: string; value: string; color?: string }) => (
    <Card style={{ flex: 1 }}>
      <Text style={[s.h2, { color: color || C.label, fontSize: 24 }]}>{value}</Text>
      <Text style={s.sub}>{title}</Text>
    </Card>
  );

  if (loading) return <View style={[s.screen, { justifyContent: 'center' }]}><ActivityIndicator size="large" color={C.accent} /></View>;
  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.content, { paddingTop: top, paddingBottom: BOTTOM_PAD }]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.accent} />}>
      <View>
        <Text style={s.h1}>لوحة التحكم</Text>
        <Text style={s.sub}>نظرة عامة على متجرك وطلباتك</Text>
      </View>
      {err ? <Text style={[s.sub, { color: '#F2A199' }]}>{err}</Text> : null}

      <View style={s.row}>
        <Stat title="مجموع الطلبات" value={String(total)} />
        <Stat title="طلبات قيد التنفيذ" value={String(active)} color="#F5BF91" />
      </View>
      <View style={s.row}>
        <Stat title="تم التوصيل" value={String(count('delivered'))} color="#59D98C" />
        <Stat title="المرتجعات" value={String(count('returned'))} color="#F5BAB2" />
      </View>

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
