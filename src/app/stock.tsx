import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { api, dzd } from '../lib/api';
import { BOTTOM_PAD, C, Card, s } from '../components/ui';

export default function Stock() {
  const [stock, setStock] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => { try { setStock(await api.stock()); } catch { /* ignore */ } setLoading(false); })(); }, []);
  if (loading) return <View style={[s.screen, { justifyContent: 'center' }]}><ActivityIndicator size="large" color={C.accent} /></View>;
  const items: any[] = stock?.allItems || [];
  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.content, { paddingBottom: BOTTOM_PAD }]}>
      <Text style={s.h1}>المخزون</Text>
      <View style={s.row}>
        <Card style={{ flex: 1 }}>
          <Text style={[s.h2, { fontSize: 22 }]}>{stock?.totalSkus ?? 0}</Text>
          <Text style={s.sub}>أصناف (SKU)</Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text style={[s.h2, { fontSize: 22 }]}>{dzd(stock?.totalInventoryValue)}</Text>
          <Text style={s.sub}>قيمة المخزون</Text>
        </Card>
      </View>
      <View style={s.row}>
        <Card style={{ flex: 1 }}>
          <Text style={[s.h2, { fontSize: 22, color: '#F5BF91' }]}>{stock?.lowStockCount ?? 0}</Text>
          <Text style={s.sub}>مخزون منخفض</Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text style={[s.h2, { fontSize: 22, color: '#F2A199' }]}>{stock?.outOfStockCount ?? 0}</Text>
          <Text style={s.sub}>نفد مخزونها</Text>
        </Card>
      </View>
      {items.map((it: any, i: number) => (
        <Card key={it.variantId || it.productId || i}>
          <View style={[s.row, { justifyContent: 'space-between' }]}>
            <View style={s.grow}>
              <Text style={[s.txt, { fontWeight: '600' }]}>{it.productName || 'منتج'}</Text>
              <Text style={s.sub}>{[it.variantLabel, it.sku].filter(Boolean).join(' · ')}</Text>
            </View>
            <Text style={[s.txt, { fontWeight: '700', color: it.isOutOfStock ? '#F2A199' : C.label }]}>{it.inventory} قطعة</Text>
          </View>
        </Card>
      ))}
      {items.length === 0 ? <Text style={s.sub}>لا توجد أصناف متعقّبة في المخزون.</Text> : null}
    </ScrollView>
  );
}
