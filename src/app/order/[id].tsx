import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { ALL_STATUSES, api, dzd, fmtDate, nextStatus, STATUS_LABEL, waNumber } from '../../lib/api';
import { C, Card, s, StatusPill } from '../../components/ui';

export default function OrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const all = await api.orders();
      setOrder(all.find((o) => o.id === id) || null);
    } catch { /* keep */ }
    setLoading(false);
  }, [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const setStatus = async (status: string) => {
    if (!order || busy) return;
    setBusy(true);
    try {
      await api.setStatus(order.id, status);
      setOrder({ ...order, status });
    } catch { Alert.alert('خطأ', 'تعذر تحديث الحالة'); }
    setBusy(false);
  };

  if (loading) return <View style={[s.screen, { justifyContent: 'center' }]}><ActivityIndicator size="large" color={C.accent} /></View>;
  if (!order) return <View style={s.screen}><Text style={[s.sub, { padding: 16 }]}>الطلب غير موجود.</Text></View>;

  const items: any[] = Array.isArray(order.items) ? order.items : [];
  const nxt = nextStatus(order.status);
  const L = ({ k, v }: { k: string; v?: string }) => (
    <View style={[s.row, { justifyContent: 'space-between' }]}>
      <Text style={s.sub}>{k}</Text>
      <Text style={[s.txt, { fontWeight: '600' }]}>{v || '—'}</Text>
    </View>
  );

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <View style={[s.row, { justifyContent: 'space-between' }]}>
        <Text style={s.h2}>{order.orderNumber || 'طلب'}</Text>
        <StatusPill status={order.status} />
      </View>
      <Card style={{ gap: 8 }}>
        <L k="العميل" v={order.customerName} />
        <L k="الهاتف" v={order.phone} />
        <L k="الولاية" v={order.wilaya || order.commune || ''} />
        <L k="العنوان" v={order.address} />
        <L k="التاريخ" v={fmtDate(order.createdAt)} />
        {order.notes ? <L k="ملاحظات" v={order.notes} /> : null}
      </Card>
      <Card style={{ gap: 8 }}>
        <Text style={s.h2}>المحتوى</Text>
        {items.length ? items.map((it, i) => (
          <View key={i} style={[s.row, { justifyContent: 'space-between' }]}>
            <Text style={s.txt}>{it.productName || it.name || 'منتج'} × {it.quantity ?? 1}</Text>
            <Text style={s.txt}>{dzd(it.price ?? it.unitPrice)}</Text>
          </View>
        )) : <Text style={s.txt}>{order.productName || 'منتج'} × {order.quantity ?? 1}</Text>}
        <View style={{ height: 0.5, backgroundColor: C.hairline }} />
        <L k="المجموع الفرعي" v={dzd(order.price)} />
        <L k="التوصيل" v={dzd(order.deliveryFee)} />
        <View style={[s.row, { justifyContent: 'space-between' }]}>
          <Text style={[s.txt, { fontWeight: '700' }]}>الدفع عند الاستلام</Text>
          <Text style={[s.txt, { fontWeight: '800', color: C.accent }]}>{dzd(order.codAmount ?? order.price)}</Text>
        </View>
      </Card>
      <View style={s.row}>
        <Pressable style={{ flex: 1 }} onPress={() => order.phone && Linking.openURL(`tel:${order.phone}`)}>
          <View style={[s.card, { alignItems: 'center', paddingVertical: 12 }]}><Text style={[s.txt, { fontWeight: '700' }]}>اتصال</Text></View>
        </Pressable>
        <Pressable style={{ flex: 1 }} onPress={() => order.phone && Linking.openURL(`https://wa.me/${waNumber(order.phone)}`)}>
          <View style={[s.card, { alignItems: 'center', paddingVertical: 12 }]}><Text style={[s.txt, { fontWeight: '700', color: '#59D98C' }]}>واتساب</Text></View>
        </Pressable>
      </View>
      {nxt ? (
        <Pressable disabled={busy} onPress={() => setStatus(nxt)} style={{ backgroundColor: C.accent, borderRadius: 20, paddingVertical: 15, alignItems: 'center', opacity: busy ? 0.6 : 1 }}>
          <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 16 }}>{`التالي: ${STATUS_LABEL[nxt]}`}</Text>
        </Pressable>
      ) : null}
      <Card style={{ gap: 10 }}>
        <Text style={s.h2}>تغيير الحالة</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {ALL_STATUSES.map((k) => {
            const active = order.status === k;
            return (
              <Pressable key={k} disabled={busy} onPress={() => setStatus(k)} style={{ backgroundColor: active ? C.label : 'rgba(255,255,255,0.08)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 }}>
                <Text style={{ color: active ? '#000' : C.secondary, fontWeight: '600', fontSize: 13 }}>{STATUS_LABEL[k]}</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>
    </ScrollView>
  );
}
