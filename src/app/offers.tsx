import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { api, dzd } from '../lib/api';
import { BOTTOM_PAD, C, Card, KV, s } from '../components/ui';

export default function Offers() {
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => { try { setOffers(await api.offers()); } catch { /* ignore */ } setLoading(false); })(); }, []);
  if (loading) return <View style={[s.screen, { justifyContent: 'center' }]}><ActivityIndicator size="large" color={C.accent} /></View>;
  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.content, { paddingBottom: BOTTOM_PAD }]}>
      <Text style={s.h1}>العروض والخصومات</Text>
      {offers.map((o: any) => (
        <Card key={o.id} style={{ gap: 8 }}>
          <Text style={[s.txt, { fontWeight: '700' }]}>{o.name || o.title || 'عرض'}</Text>
          <KV k="النوع" v={o.type} />
          <KV k="القيمة" v={o.value !== null && o.value !== undefined ? (o.type === 'PERCENTAGE' ? `${o.value}%` : dzd(o.value)) : null} />
          <KV k="الحالة" v={o.isActive === false ? 'غير مفعّل' : o.status || 'مفعّل'} />
          <KV k="الوصف" v={o.description} />
        </Card>
      ))}
      {offers.length === 0 ? <Text style={s.sub}>لا توجد عروض بعد. العروض تُنشأ من لوحة الويب.</Text> : null}
    </ScrollView>
  );
}
