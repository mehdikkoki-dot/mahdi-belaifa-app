import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { api, dzd } from '../../lib/api';
import { C, Card, s } from '../../components/ui';

export default function Customers() {
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    try { setCustomers(await api.customers()); } catch { /* keep */ }
    setLoading(false); setRefreshing(false);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <View style={[s.screen, { justifyContent: 'center' }]}><ActivityIndicator size="large" color={C.accent} /></View>;
  return (
    <FlatList
      style={s.screen}
      data={customers}
      keyExtractor={(c) => c.id}
      ListHeaderComponent={<Text style={[s.h1, { paddingBottom: 4 }]}>العملاء</Text>}
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 120 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.accent} />}
      ListEmptyComponent={<Text style={s.sub}>لا يوجد عملاء بعد.</Text>}
      renderItem={({ item: c }) => (
        <Pressable onPress={() => router.push(`/customer/${c.id}` as any)}>
          <Card>
            <View style={s.row}>
              <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(237,41,41,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: C.accent, fontWeight: '800', fontSize: 17 }}>{(c.name || '؟').trim().charAt(0)}</Text>
              </View>
              <View style={s.grow}>
                <Text style={[s.txt, { fontWeight: '700' }]}>{c.name || '—'}</Text>
                <Text style={s.sub}>{c.phone || ''}{c.wilaya ? ` · ${c.wilaya}` : ''}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[s.txt, { fontWeight: '700' }]}>{c.totalOrders ?? 0} طلب</Text>
                <Text style={s.sub}>{dzd(c.totalSpent)}</Text>
              </View>
            </View>
          </Card>
        </Pressable>
      )}
    />
  );
}
