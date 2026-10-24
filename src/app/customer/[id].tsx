import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { api, dzd, fmtDate, waNumber } from '../../lib/api';
import { C, Card, s, StatusPill } from '../../components/ui';

export default function CustomerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [cust, setCust] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      const [all, or] = await Promise.all([api.customers(), api.customerOrders(id!)]);
      setCust(all.find((x) => x.id === id) || null);
      setOrders(Array.isArray(or) ? or : []);
    } catch { /* keep */ }
    setLoading(false);
  }, [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <View style={[s.screen, { justifyContent: 'center' }]}><ActivityIndicator size="large" color={C.accent} /></View>;
  if (!cust) return <View style={s.screen}><Text style={[s.sub, { padding: 16 }]}>العميل غير موجود.</Text></View>;

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <Card style={{ alignItems: 'center', gap: 5, paddingVertical: 20 }}>
        <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(237,41,41,0.15)', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: C.accent, fontWeight: '800', fontSize: 22 }}>{(cust.name || '؟').trim().charAt(0)}</Text>
        </View>
        <Text style={[s.h2, { fontSize: 19 }]}>{cust.name}</Text>
        <Text style={s.sub}>{cust.phone || ''}{cust.wilaya ? ` · ${cust.wilaya}${cust.commune ? '، ' + cust.commune : ''}` : ''}</Text>
        <Text style={s.sub}>{cust.totalOrders ?? orders.length} طلب · {dzd(cust.totalSpent)}</Text>
      </Card>
      <View style={s.row}>
        <Pressable style={{ flex: 1 }} onPress={() => cust.phone && Linking.openURL(`tel:${cust.phone}`)}>
          <View style={[s.card, { alignItems: 'center', paddingVertical: 12 }]}><Text style={[s.txt, { fontWeight: '700' }]}>اتصال</Text></View>
        </Pressable>
        <Pressable style={{ flex: 1 }} onPress={() => cust.phone && Linking.openURL(`https://wa.me/${waNumber(cust.phone)}`)}>
          <View style={[s.card, { alignItems: 'center', paddingVertical: 12 }]}><Text style={[s.txt, { fontWeight: '700', color: '#59D98C' }]}>واتساب</Text></View>
        </Pressable>
      </View>
      <Text style={s.h2}>طلبات العميل</Text>
      {orders.map((o) => (
        <Pressable key={o.id} onPress={() => router.push(`/order/${o.id}` as any)}>
          <Card>
            <View style={s.row}>
              <View style={s.grow}>
                <Text style={s.txt}>{o.orderNumber || 'طلب'}</Text>
                <Text style={s.sub}>{fmtDate(o.createdAt)}</Text>
              </View>
              <StatusPill status={o.status} />
              <Text style={[s.txt, { fontWeight: '700' }]}>{dzd(o.codAmount ?? o.price)}</Text>
            </View>
          </Card>
        </Pressable>
      ))}
      {orders.length === 0 ? <Text style={s.sub}>لا توجد طلبات.</Text> : null}
    </ScrollView>
  );
}
