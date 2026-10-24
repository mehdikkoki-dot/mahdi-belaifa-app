import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { api, dzd } from '../../lib/api';
import { C, Card, s } from '../../components/ui';

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [p, setP] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try { const all = await api.products(); setP(all.find((x) => x.id === id) || null); } catch { /* keep */ }
    setLoading(false);
  }, [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <View style={[s.screen, { justifyContent: 'center' }]}><ActivityIndicator size="large" color={C.accent} /></View>;
  if (!p) return <View style={s.screen}><Text style={[s.sub, { padding: 16 }]}>المنتج غير موجود.</Text></View>;

  const images: string[] = (Array.isArray(p.images) ? p.images : []).map((im: any) => (typeof im === 'string' ? im : im?.src)).filter(Boolean);
  const variants: any[] = Array.isArray(p.variants) ? p.variants : [];
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      {images.length ? (
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ borderRadius: 26 }}>
          {images.map((uri) => <Image key={uri} source={{ uri }} style={{ width: 340, height: 300, borderRadius: 26 }} contentFit="cover" />)}
        </ScrollView>
      ) : null}
      <Text style={s.h2}>{p.name}</Text>
      <View style={s.row}>
        <Text style={[s.txt, { fontWeight: '800', color: C.accent, fontSize: 19 }]}>{dzd(p.price)}</Text>
        {p.compareAtPrice ? <Text style={[s.sub, { textDecorationLine: 'line-through', fontSize: 15 }]}>{dzd(p.compareAtPrice)}</Text> : null}
      </View>
      {p.description ? <Card><Text style={s.txt}>{p.description}</Text></Card> : null}
      {variants.length ? (
        <Card style={{ gap: 10 }}>
          <Text style={s.h2}>الخيارات</Text>
          {variants.map((v) => {
            const label = v.label || (v.variations ? Object.values(v.variations).join(' · ') : '') || v.sku || 'خيار';
            return (
              <View key={v.id || label} style={[s.row, { justifyContent: 'space-between' }]}>
                <Text style={s.txt}>{label}</Text>
                <Text style={s.sub}>{v.price ? dzd(v.price) : ''}{v.sku ? ` · ${v.sku}` : ''}</Text>
              </View>
            );
          })}
        </Card>
      ) : null}
    </ScrollView>
  );
}
