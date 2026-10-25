import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { api, dzd } from '../../lib/api';
import { BOTTOM_PAD, C, Card, s, SearchBox, useTopPad } from '../../components/ui';

export default function Customers() {
  const router = useRouter();
  const top = useTopPad();
  const [customers, setCustomers] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setCustomers(await api.customers()); } catch { /* keep last */ }
    setLoading(false); setRefreshing(false);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return customers;
    return customers.filter((c) => [c.name, c.phone, c.wilaya, c.commune].some((v) => String(v || '').toLowerCase().includes(needle)));
  }, [customers, q]);

  if (loading) return <View style={[s.screen, { justifyContent: 'center' }]}><ActivityIndicator size="large" color={C.accent} /></View>;
  return (
    <View style={s.screen}>
      <View style={{ paddingTop: top, paddingHorizontal: 16, gap: 10 }}>
        <Text style={s.h1}>العملاء</Text>
        <SearchBox value={q} onChange={setQ} placeholder="ابحث بالاسم، الهاتف، الولاية..." />
      </View>
      <FlatList
        data={shown}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: BOTTOM_PAD }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.accent} />}
        ListEmptyComponent={<Text style={s.sub}>لا يوجد عملاء مطابقون.</Text>}
        renderItem={({ item: c }) => (
          <Pressable onPress={() => router.push(`/customer/${c.id}` as any)}>
            <Card>
              <View style={s.row}>
                <View style={s.grow}>
                  <Text style={[s.txt, { fontWeight: '700' }]}>{c.name || '—'}</Text>
                  <Text style={s.sub}>{c.phone || ''}{c.wilaya ? ` · ${c.wilaya}` : ''}{c.commune ? ` — ${c.commune}` : ''}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[s.txt, { fontWeight: '700' }]}>{c.totalOrders ?? 0} طلبات</Text>
                  <Text style={s.sub}>أنفق {dzd(c.totalSpent)}</Text>
                </View>
              </View>
            </Card>
          </Pressable>
        )}
      />
    </View>
  );
}
