import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, View } from 'react-native';
import { api, dzd, variantLabel } from '../../lib/api';
import { BOTTOM_PAD, C, Card, KV, s } from '../../components/ui';

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { const all = await api.products(); setProduct(all.find((p) => p.id === id) || null); } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <View style={[s.screen, { justifyContent: 'center' }]}><ActivityIndicator size="large" color={C.accent} /></View>;
  if (!product) return <View style={s.screen}><Text style={[s.txt, { padding: 16 }]}>المنتج غير موجود.</Text></View>;

  const images: string[] = [product.primaryImageSrc, ...((product.images || []).map((im: any) => im.src || im.url))].filter(Boolean);
  const stock = product.totalInventory ?? product.inventory ?? null;

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.content, { paddingBottom: BOTTOM_PAD }]}>
      {images[0] ? <Image source={{ uri: images[0] }} style={{ width: '100%', height: 260, borderRadius: 26, backgroundColor: '#2C2C2E' }} resizeMode="cover" /> : null}
      <Card style={{ gap: 8 }}>
        <Text style={[s.h2, { fontSize: 19 }]}>{product.name || '—'}</Text>
        <View style={s.row}>
          <Text style={[s.txt, { fontWeight: '700', fontSize: 17 }]}>{dzd(product.price)}</Text>
          {product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price) ? <Text style={[s.sub, { textDecorationLine: 'line-through', fontSize: 15 }]}>{dzd(product.compareAtPrice)}</Text> : null}
        </View>
        <KV k="الحالة" v={product.status === 'ACTIVE' ? 'مفعّل' : product.status} />
        <KV k="المخزون الإجمالي" v={stock !== null ? String(stock) : 'غير متعقّب'} bold />
        <KV k="رمز SKU" v={product.sku} />
        <KV k="الوسوم" v={Array.isArray(product.tags) && product.tags.length ? product.tags.join('، ') : null} />
      </Card>
      {product.descriptionPlain || product.description ? (
        <Card>
          <Text style={[s.h2, { marginBottom: 6 }]}>الوصف</Text>
          <Text style={s.txt}>{product.descriptionPlain || product.description}</Text>
        </Card>
      ) : null}
      {Array.isArray(product.variants) && product.variants.length > 0 ? (
        <Card style={{ gap: 10 }}>
          <Text style={s.h2}>الخيارات والمخزون</Text>
          {product.variants.map((v: any) => (
            <View key={v.id} style={[s.row, { justifyContent: 'space-between' }]}>
              <View style={s.grow}>
                <Text style={[s.txt, { fontWeight: '600' }]}>{variantLabel(v) || 'خيار'}</Text>
                <Text style={s.sub}>{[v.sku, v.inventory !== null && v.inventory !== undefined ? `المخزون: ${v.inventory}` : null].filter(Boolean).join(' · ')}</Text>
              </View>
              <Text style={[s.txt, { fontWeight: '700' }]}>{dzd(v.price ?? product.price)}</Text>
            </View>
          ))}
        </Card>
      ) : null}
      {images.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {images.slice(1).map((src, i) => <Image key={i} source={{ uri: src }} style={{ width: 120, height: 120, borderRadius: 18, backgroundColor: '#2C2C2E' }} />)}
        </ScrollView>
      ) : null}
    </ScrollView>
  );
}
