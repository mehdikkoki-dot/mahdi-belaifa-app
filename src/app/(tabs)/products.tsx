import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, Text, View } from 'react-native';
import { api, dzd } from '../../lib/api';
import { BOTTOM_PAD, C, Card, EmptyState, GlassGlow, s, SearchBox, useTopPad } from '../../components/ui';
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
    return products.filter((p) => String(p.name || '').toLowerCase().includes(needle));
  }, [products, q]);

  if (loading) return <View style={[s.screen, { justifyContent: 'center' }]}><ActivityIndicator size="large" color={C.accent} /></View>;
  return (
    <View style={s.screen}>
      <GlassGlow />
      <View style={{ paddingTop: top, paddingHorizontal: 16, gap: 10, paddingBottom: 10 }}>
        <View style={[s.row, { justifyContent: 'space-between' }]}>
          <Text style={s.h1}>المنتجات</Text>
          <Pressable onPress={() => router.push('/product-new' as any)} style={{ backgroundColor: 'rgba(130,154,137,0.38)', width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(110,134,118,0.55)' }}>
            <Text style={{ color: '#2E4B38', fontSize: 22, fontWeight: '700', lineHeight: 24 }}>+</Text>
          </Pressable>
        </View>
        <SearchBox value={q} onChange={setQ} placeholder="ابحث عن منتج..." />
      </View>
      <FlatList
        data={shown}
        numColumns={2}
        keyExtractor={(p) => p.id}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={{ padding: 16, paddingTop: 2, gap: 12, paddingBottom: BOTTOM_PAD }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.accent} />}
        ListEmptyComponent={products.length === 0 ? <EmptyState art="products" title="لا توجد منتجات بعد" sub="أضف أول منتج لبدء البيع." /> : <EmptyState art="search" title="لا نتائج مطابقة" sub="جرّب كلمة بحث أخرى." />}
        renderItem={({ item: p }) => {
          const stock = p.totalInventory ?? p.inventory ?? null;
          const out = stock !== null && Number(stock) <= 0;
          return (
            <Pressable onPress={() => router.push(`/product/${p.id}` as any)} style={{ flex: 1 }}>
              <Card style={{ padding: 0 }}>
                {p.primaryImageSrc ? <Image source={{ uri: p.primaryImageSrc }} style={{ width: '100%', aspectRatio: 1.15, borderRadius: 14, backgroundColor: '#EAE9E3' }} resizeMode="cover" /> : null}
                <View style={{ gap: 3, marginTop: 8 }}>
                  <Text style={[s.txt, { fontWeight: '700', fontSize: 14 }]} numberOfLines={2}>{p.name}</Text>
                  <Text style={[s.txt, { fontWeight: '700', color: '#5E8A6C' }]}>{dzd(p.price)}</Text>
                  <Text style={[s.sub, out ? { color: '#A85F5F', fontWeight: '700' } : null]}>{out ? 'نفد المخزون' : stock !== null ? `المخزون: ${stock}` : ''}{p.status === 'DRAFT' ? ' · مسودة' : ''}</Text>
                </View>
              </Card>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
