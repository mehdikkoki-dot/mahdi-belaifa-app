import * as Linking from 'expo-linking';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Share, Text, View } from 'react-native';
import { api, dzd, orderTotalOf, STATUS_LABEL, waNumber } from '../lib/api';
import { BOTTOM_PAD, C, Card, GlassButton, s } from '../components/ui';

const OUT = ['ready', 'assigned', 'dispatched', 'out_for_delivery'];

export default function Today() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    try { const all = await api.orders(); setOrders((all || []).filter((o: any) => OUT.includes(o.status))); } catch { /* ignore */ }
    setLoading(false); setRefreshing(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const groups = useMemo(() => {
    const map = new Map<string, any[]>();
    orders.forEach((o) => {
      const key = [o.wilaya, o.commune].filter(Boolean).join(' — ') || 'بدون مكان';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(o);
    });
    return [...map.entries()];
  }, [orders]);
  const totalDue = orders.reduce((a, o) => a + orderTotalOf(o), 0);

  const shareList = () => {
    const lines = [`قائمة التوصيل — ${new Date().toLocaleDateString('ar-DZ')}`, `المجموع عند الاستلام: ${dzd(totalDue)}`, ''];
    groups.forEach(([place, list]) => {
      lines.push(`== ${place} ==`);
      list.forEach((o, i) => lines.push(`${i + 1}. ${o.customerName || ''} · ${o.phone || ''} · ${o.address || ''} · ${dzd(orderTotalOf(o))} · ${STATUS_LABEL[o.status] || o.status}`));
      lines.push('');
    });
    Share.share({ message: lines.join('\n') });
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} size="large" color={C.accent} />;
  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.content, { paddingBottom: BOTTOM_PAD }]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.accent} />}>
      <Card style={{ gap: 4 }}>
        <Text style={s.h2}>طلبات جاهزة للخروج</Text>
        <Text style={s.sub}>{orders.length} طلب · المجموع عند الاستلام: {dzd(totalDue)}</Text>
      </Card>
      {orders.length > 0 ? <GlassButton title="مشاركة القائمة مع السائق" variant="primary" onPress={shareList} /> : null}
      {groups.map(([place, list]) => (
        <View key={place} style={{ gap: 10 }}>
          <Text style={[s.h2, { fontSize: 15 }]}>{place}</Text>
          {list.map((o) => (
            <Card key={o.id}>
              <View style={s.row}>
                <View style={s.grow}>
                  <Text style={[s.txt, { fontWeight: '700' }]}>{o.customerName || '—'}</Text>
                  <Text style={s.sub}>{[o.phone, o.address].filter(Boolean).join(' · ')}</Text>
                  <Text style={s.sub}>{o.orderNumber || ''} · {STATUS_LABEL[o.status] || o.status}</Text>
                </View>
                <Text style={[s.txt, { fontWeight: '700' }]}>{dzd(orderTotalOf(o))}</Text>
              </View>
              <View style={[s.row, { marginTop: 10, gap: 8 }]}>
                <GlassButton title="اتصال" small variant="green" flex onPress={() => o.phone && Linking.openURL(`tel:${o.phone}`)} />
                <GlassButton title="واتساب" small variant="green" flex onPress={() => o.phone && Linking.openURL(`https://wa.me/${waNumber(o.phone)}`)} />
              </View>
            </Card>
          ))}
        </View>
      ))}
      {orders.length === 0 ? <Text style={s.sub}>لا توجد طلبات جاهزة للتوصيل الآن.</Text> : null}
    </ScrollView>
  );
}
