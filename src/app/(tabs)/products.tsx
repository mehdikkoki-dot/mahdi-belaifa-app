import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, Text, View } from 'react-native';
import { api, dzd } from '../../lib/api';
import { BOTTOM_PAD, C, Card, s, SearchBox, useTopPad } from '../../components/ui';
import { loadCache, saveCache } from '../../lib/cache';

export default function Products() {
  const router = useRouter();
  const top = useTopPad();
  const [products, setProducts] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { const data = await api.products(); setProducts(data); saveCache('products', data); }
    catch { const cached = await loadCache('products'); if (cached) setProducts(cached); }
    setLoading(false); setRefreshing(false);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return products;
    return products.filter((p) => [p.name, p.sku, p.handle].some((v) => String(v || '').toLowerCase().includes(needle)));
  }, [products, q]);

  if (loading) return <View style={[s.screen, { justifyContent: 'center' }]}><ActivityIndicator size="large" color={C.accent} /></View>;
  return (
    <View style={s.screen}>
      <View style={{ paddingTop: top, paddingHorizontal: 16, gap: 10 }}>
        <View style={[s.row, { justifyContent: 'space-between' }]}>
          <Text style={s.h1}>المنتجات</Text>
          <Pressable onPress={() => router.push('/product-new' as any)} style={{ backgroundColor: C.accent, width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 24 }}>+</Text>
        </Pressable>
        </View>
        <SearchBox value={q} onChange={setQ} placeholder="ابحث عن منتج..." />
      </View>
      <FlatList
        data={shown}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: BOTTOM_PAD }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.accent} />}
        ListEmptyComponent={<Text style={s.sub}>لا توجد منتجات مطابقة.</Text>}
        renderItem={({ item: p }) => {
          const stock = p.totalInventory ?? p.inventory ?? null;
          const out = stock !== null && Number(stock) <= 0;
          return (
            <Pressable onPress={() => router.push(`/product/${p.id}` as any)}>
              <Card>
                <View style={s.row}>
                  {p.primaryImageSrc ? <Image source={{ uri: p.primaryImageSrc }} style={{ width: 58, height: 58, borderRadius: 14, backgroundColor: '#2C2C2E' }} /> : null}
                  <View style={s.grow}>
                    <Text style={[s.txt, { fontWeight: '700' }]}>{p.name || '—'}</Text>
                    <Text style={s.sub}>
                      {p.hasVariants ? `${p.variantsCount ?? (p.variants?.length ?? 0)} خيارات · ` : ''}
                      {stock !== null ? `المخزون: ${stock}` : 'المخزون غير متعقّب'}
                      {p.status && p.status !== 'ACTIVE' ? ` · ${p.status}` : ''}
                    </Text>
                    {out ? <Text style={[s.sub, { color: '#F2A199', fontWeight: '700' }]}>نفد المخزون</Text> : null}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[s.txt, { fontWeight: '700' }]}>{dzd(p.price)}</Text>
                    {p.compareAtPrice && Number(p.compareAtPrice) > Number(p.price) ? <Text style={[s.sub, { textDecorationLine: 'line-through' }]}>{dzd(p.compareAtPrice)}</Text> : null}
                  </View>
                </View>
              </Card>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
