import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { api, dzd } from '../lib/api';
import { BOTTOM_PAD, C, Card, s, SearchBox, GlassGlow } from '../components/ui';
import { loadCache, saveCache } from '../lib/cache';

export default function Customers() {
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { const data = await api.customers(); setCustomers(data); saveCache('customers', data); }
    catch { const cached = await loadCache('customers'); if (cached) setCustomers(cached); }
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
      <GlassGlow />
      <View style={{ paddingTop: 16, paddingHorizontal: 16, gap: 10 }}>
        <View style={[s.row, { justifyContent: 'space-between' }]}>
          <Text style={s.h1}>العملاء</Text>
          <Pressable onPress={() => router.push('/customer-new' as any)} style={{ backgroundColor: 'rgba(130,154,137,0.38)', width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(110,134,118,0.55)' }}>
          <Text style={{ color: '#2E4B38', fontSize: 22, fontWeight: '700', lineHeight: 24 }}>+</Text>
        </Pressable>
        </View>
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
