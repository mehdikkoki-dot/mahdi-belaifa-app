import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { ALL_STATUSES, api, dzd, orderTotalOf, relTime, STATUS_LABEL } from '../../lib/api';
import { BOTTOM_PAD, C, Card, FadeIn, s, SearchBox, StatusPill, useTopPad, GlassGlow } from '../../components/ui';
import { loadCache, saveCache } from '../../lib/cache';

export default function Orders() {
  const router = useRouter();
  const top = useTopPad();
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { const data = await api.orders(); setOrders(data); saveCache('orders', data); }
    catch { const cached = await loadCache('orders'); if (cached) setOrders(cached); }
    setLoading(false); setRefreshing(false);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const shown = useMemo(() => {
    let list = filter === 'all' ? orders : orders.filter((o) => o.status === filter);
    const needle = q.trim().toLowerCase();
    if (needle) list = list.filter((o) => [o.orderNumber, o.customerName, o.phone, o.productName].some((v) => String(v || '').toLowerCase().includes(needle)));
    return list;
  }, [orders, filter, q]);
  const present = useMemo(() => ALL_STATUSES.filter((k) => orders.some((o) => o.status === k)), [orders]);

  if (loading) return <View style={[s.screen, { justifyContent: 'center' }]}><ActivityIndicator size="large" color={C.accent} /></View>;
  return (
    <View style={s.screen}>
      <GlassGlow />
      <View style={{ paddingTop: top, paddingHorizontal: 16, gap: 10 }}>
        <View style={[s.row, { justifyContent: 'space-between' }]}>
          <Text style={s.h1}>الطلبات</Text>
          <Pressable onPress={() => router.push('/order-new' as any)} style={{ backgroundColor: 'rgba(237,41,41,0.88)', width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', shadowColor: '#ED2929', shadowOpacity: 0.45, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }}>
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 24 }}>+</Text>
        </Pressable>
        </View>
        <SearchBox value={q} onChange={setQ} placeholder="ابحث برقم الطلب، الاسم، الهاتف..." />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 10 }}>
        {['all', ...present].map((k) => {
          const active = filter === k;
          const n = k === 'all' ? orders.length : orders.filter((o) => o.status === k).length;
          return (
            <Pressable key={k} onPress={() => setFilter(k)} style={{ backgroundColor: active ? C.label : 'rgba(255,255,255,0.08)', borderColor: active ? C.label : 'rgba(255,255,255,0.14)', borderWidth: 0.8, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 }}>
              <Text style={{ color: active ? '#000' : C.secondary, fontWeight: '600', fontSize: 13 }}>{k === 'all' ? `الكل (${n})` : `${STATUS_LABEL[k]} (${n})`}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <FlatList
        data={shown}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 12, paddingBottom: BOTTOM_PAD }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.accent} />}
        ListEmptyComponent={<Text style={s.sub}>لا توجد طلبات مطابقة.</Text>}
        renderItem={({ item: o, index }) => (
          <FadeIn index={index}>
          <Pressable onPress={() => router.push(`/order/${o.id}` as any)}>
            <Card>
              <View style={s.row}>
                <View style={s.grow}>
                  <Text style={[s.txt, { fontWeight: '700' }]}>{o.orderNumber || ''}</Text>
                  <Text style={s.sub}>{o.customerName || '—'}{o.phone ? ` · ${o.phone}` : ''}</Text>
                  {o.productName ? <Text style={s.sub}>{o.productName} × {o.quantity ?? 1}</Text> : null}
                </View>
                <StatusPill status={o.status} />
              </View>
              <View style={[s.row, { justifyContent: 'space-between', marginTop: 8 }]}>
                <Text style={[s.txt, { fontWeight: '700' }]}>{dzd(orderTotalOf(o))}</Text>
                <Text style={s.sub}>{relTime(o.createdAt)}</Text>
              </View>
            </Card>
          </Pressable>
          </FadeIn>
        )}
      />
    </View>
  );
}
