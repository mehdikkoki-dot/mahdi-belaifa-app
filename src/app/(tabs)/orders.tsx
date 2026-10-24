import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { ALL_STATUSES, api, dzd, fmtDate, STATUS_LABEL } from '../../lib/api';
import { C, Card, s, StatusPill } from '../../components/ui';

export default function Orders() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setOrders(await api.orders()); } catch { /* keep last */ }
    setLoading(false); setRefreshing(false);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const shown = useMemo(() => (filter === 'all' ? orders : orders.filter((o) => o.status === filter)), [orders, filter]);
  const present = useMemo(() => ALL_STATUSES.filter((k) => orders.some((o) => o.status === k)), [orders]);

  if (loading) return <View style={[s.screen, { justifyContent: 'center' }]}><ActivityIndicator size="large" color={C.accent} /></View>;
  return (
    <View style={s.screen}>
      <Text style={[s.h1, { padding: 16, paddingBottom: 4 }]}>الطلبات</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 8 }}>
        {['all', ...present].map((k) => {
          const active = filter === k;
          return (
            <Pressable key={k} onPress={() => setFilter(k)} style={{ backgroundColor: active ? C.label : 'rgba(255,255,255,0.08)', borderColor: active ? C.label : 'rgba(255,255,255,0.14)', borderWidth: 0.8, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 }}>
              <Text style={{ color: active ? '#000' : C.secondary, fontWeight: '600', fontSize: 13 }}>{k === 'all' ? `الكل (${orders.length})` : `${STATUS_LABEL[k]} (${orders.filter((o) => o.status === k).length})`}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <FlatList
        data={shown}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.accent} />}
        ListEmptyComponent={<Text style={s.sub}>لا توجد طلبات في هذه الحالة.</Text>}
        renderItem={({ item: o }) => (
          <Pressable onPress={() => router.push(`/order/${o.id}` as any)}>
            <Card>
              <View style={s.row}>
                <View style={s.grow}>
                  <Text style={[s.txt, { fontWeight: '700' }]}>{o.customerName || '—'}</Text>
                  <Text style={s.sub}>{o.productName ? `${o.productName} × ${o.quantity ?? 1} · ` : ''}{o.orderNumber || ''}</Text>
                  <Text style={s.sub}>{fmtDate(o.createdAt)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <StatusPill status={o.status} />
                  <Text style={[s.txt, { fontWeight: '700' }]}>{dzd(o.codAmount ?? o.price)}</Text>
                </View>
              </View>
            </Card>
          </Pressable>
        )}
      />
    </View>
  );
}
