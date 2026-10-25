import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { api, dzd, fmtDate, orderTotalOf, waNumber } from '../../lib/api';
import { BOTTOM_PAD, C, Card, KV, s, StatusPill } from '../../components/ui';

export default function CustomerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [customer, setCustomer] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [all, ords] = await Promise.all([api.customers(), api.customerOrders(id).catch(() => [])]);
      setCustomer(all.find((c) => c.id === id) || null);
      setOrders(Array.isArray(ords) ? ords : []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <View style={[s.screen, { justifyContent: 'center' }]}><ActivityIndicator size="large" color={C.accent} /></View>;
  if (!customer) return <View style={s.screen}><Text style={[s.txt, { padding: 16 }]}>العميل غير موجود.</Text></View>;

  const place = [customer.wilaya, customer.commune].filter(Boolean).join(' — ');

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.content, { paddingBottom: BOTTOM_PAD }]}>
      <Card style={{ gap: 8 }}>
        <Text style={[s.h2, { fontSize: 19 }]}>{customer.name || '—'}</Text>
        <KV k="الهاتف" v={customer.phone} />
        <KV k="هاتف ثانٍ" v={customer.phone2} />
        <KV k="الولاية — البلدية" v={place || null} />
        <KV k="العنوان" v={customer.address} />
        <KV k="عميل منذ" v={customer.createdAt ? fmtDate(customer.createdAt) : null} />
        <KV k="آخر طلب" v={customer.lastOrderAt ? fmtDate(customer.lastOrderAt) : null} />
        <Pressable onPress={() => router.push(`/customer-new?id=${customer.id}` as any)} style={{ backgroundColor: 'rgba(237,41,41,0.92)', borderRadius: 16, paddingVertical: 11, alignItems: 'center', marginTop: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', shadowColor: '#ED2929', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14.5 }}>تعديل العميل</Text>
        </Pressable>
        <View style={[s.row, { marginTop: 6 }]}>
          <Pressable style={{ flex: 1, backgroundColor: '#21301F', borderRadius: 14, paddingVertical: 11, alignItems: 'center' }} onPress={() => customer.phone && Linking.openURL(`tel:${customer.phone}`)}>
            <Text style={{ color: '#59D98C', fontWeight: '700', fontSize: 14 }}>اتصال</Text>
          </Pressable>
          <Pressable style={{ flex: 1, backgroundColor: '#12291C', borderRadius: 14, paddingVertical: 11, alignItems: 'center' }} onPress={() => customer.phone && Linking.openURL(`https://wa.me/${waNumber(customer.phone)}`)}>
            <Text style={{ color: '#59D98C', fontWeight: '700', fontSize: 14 }}>WhatsApp</Text>
          </Pressable>
        </View>
      </Card>

      <View style={s.row}>
        <Card style={{ flex: 1 }}>
          <Text style={[s.h2, { fontSize: 22 }]}>{customer.totalOrders ?? orders.length}</Text>
          <Text style={s.sub}>مجموع الطلبات</Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text style={[s.h2, { fontSize: 22 }]}>{dzd(customer.totalSpent)}</Text>
          <Text style={s.sub}>مجموع ما أنفق</Text>
        </Card>
      </View>

      <Text style={s.h2}>طلبات العميل</Text>
      {orders.map((o) => (
        <Pressable key={o.id} onPress={() => router.push(`/order/${o.id}` as any)}>
          <Card>
            <View style={s.row}>
              <View style={s.grow}>
                <Text style={[s.txt, { fontWeight: '700' }]}>{o.orderNumber || ''}</Text>
                <Text style={s.sub}>{fmtDate(o.createdAt)}{o.productName ? ` · ${o.productName}` : ''}</Text>
              </View>
              <StatusPill status={o.status} />
              <Text style={[s.txt, { fontWeight: '700' }]}>{dzd(orderTotalOf(o))}</Text>
            </View>
          </Card>
        </Pressable>
      ))}
      {orders.length === 0 ? <Text style={s.sub}>لا توجد طلبات لهذا العميل.</Text> : null}
    </ScrollView>
  );
}
