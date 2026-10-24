import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { api, dzd } from '../../lib/api';
import { C, Card, s } from '../../components/ui';

export default function Products() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    try { setProducts(await api.products()); } catch { /* keep */ }
    setLoading(false); setRefreshing(false);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <View style={[s.screen, { justifyContent: 'center' }]}><ActivityIndicator size="large" color={C.accent} /></View>;
  return (
    <FlatList
      style={s.screen}
      data={products}
      keyExtractor={(p) => p.id}
      ListHeaderComponent={<Text style={[s.h1, { paddingBottom: 4 }]}>المنتجات</Text>}
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 120 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.accent} />}
      renderItem={({ item: p }) => {
        const img = Array.isArray(p.images) && p.images.length ? (typeof p.images[0] === 'string' ? p.images[0] : p.images[0]?.src) : null;
        return (
          <Pressable onPress={() => router.push(`/product/${p.id}` as any)}>
            <Card>
              <View style={s.row}>
                {img ? <Image source={{ uri: img }} style={{ width: 64, height: 64, borderRadius: 16 }} contentFit="cover" /> : null}
                <View style={s.grow}>
                  <Text style={[s.txt, { fontWeight: '700' }]} numberOfLines={2}>{p.name || '—'}</Text>
                  <Text style={s.sub}>{Array.isArray(p.variants) ? `${p.variants.length} خيارات` : ''}{p.status === 'draft' ? ' · مسودة' : ''}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[s.txt, { fontWeight: '800', color: C.accent }]}>{dzd(p.price)}</Text>
                  {p.compareAtPrice ? <Text style={[s.sub, { textDecorationLine: 'line-through' }]}>{dzd(p.compareAtPrice)}</Text> : null}
                </View>
              </View>
            </Card>
          </Pressable>
        );
      }}
    />
  );
}
