import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Share, Text, View } from 'react-native';
import { ALL_STATUSES, api, dzd, fmtDate, nextStatus, orderTotalOf, STATUS_COLOR, STATUS_LABEL, waNumber } from '../../lib/api';
import { BOTTOM_PAD, C, Card, GlassButton, KV, s, StatusPill } from '../../components/ui';

export default function OrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setOrder(await api.order(id)); }
    catch {
      try { const all = await api.orders(); setOrder(all.find((o) => o.id === id) || null); } catch { /* ignore */ }
    }
    setLoading(false); setRefreshing(false);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const setStatus = async (st: string) => {
    if (!order || busy) return;
    if (st === 'cancelled' || st === 'returned') {
      const label = STATUS_LABEL[st];
      const ok = await new Promise<boolean>((resolve) => {
        Alert.alert('تأكيد', `تغيير حالة الطلب إلى «${label}»؟`, [
          { text: 'لا', style: 'cancel', onPress: () => resolve(false) },
          { text: 'نعم', style: 'destructive', onPress: () => resolve(true) },
        ]);
      });
      if (!ok) return;
    }
    setBusy(true);
    try { await api.setStatus(order.id, st); setOrder({ ...order, status: st }); }
    catch { Alert.alert('خطأ', 'تعذر تغيير حالة الطلب'); }
    setBusy(false);
  };

  if (loading) return <View style={[s.screen, { justifyContent: 'center' }]}><ActivityIndicator size="large" color={C.accent} /></View>;
  if (!order) return <View style={s.screen}><Text style={[s.txt, { padding: 16 }]}>الطلب غير موجود.</Text></View>;

  const items: any[] = order.products || order.items || [];
  const sendStatusWa = () => {
    if (!order.phone) return;
    const msg = `مرحباً ${order.customerName || ''}، طلبك ${order.orderNumber || ''} عند SOUR حالته الآن: ${STATUS_LABEL[order.status] || order.status || ''}. المبلغ عند الاستلام: ${dzd(orderTotalOf(order))}. شكراً لثقتك.`;
    Linking.openURL(`https://wa.me/${waNumber(order.phone)}?text=${encodeURIComponent(msg)}`);
  };
  const shareSummary = () => {
    const lines = [
      `طلب ${order.orderNumber || ''} — SOUR`,
      `الزبون: ${order.customerName || ''} · ${order.phone || ''}`,
      place ? `المكان: ${place}` : null,
      order.address ? `العنوان: ${order.address}` : null,
      ...items.map((it: any) => `• ${it.productName || 'منتج'}${it.variantLabel ? ` (${it.variantLabel})` : ''} × ${it.quantity ?? 1}`),
      `المبلغ عند الاستلام: ${dzd(orderTotalOf(order))}`,
      `الحالة: ${STATUS_LABEL[order.status] || order.status || ''}`,
    ].filter(Boolean);
    Share.share({ message: lines.join('\n') });
  };
  const next = nextStatus(order.status);
  const place = [order.wilaya, order.commune].filter(Boolean).join(' — ');

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.content, { paddingBottom: BOTTOM_PAD }]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.accent} />}>
      <Card>
        <View style={[s.row, { justifyContent: 'space-between' }]}>
          <Text style={[s.h2, { fontSize: 19 }]}>{order.orderNumber || ''}</Text>
          <StatusPill status={order.status} />
        </View>
        <Text style={s.sub}>{fmtDate(order.createdAt)} · {order.orderType === 'online' ? 'طلب عبر الإنترنت' : order.orderType || ''}</Text>
        <Text style={[s.h2, { fontSize: 22, marginTop: 6 }]}>{dzd(orderTotalOf(order))}</Text>
        <Text style={s.sub}>المبلغ عند الاستلام (COD)</Text>
      </Card>

      {items.length > 0 ? (
        <Card style={{ gap: 10 }}>
          <Text style={s.h2}>المنتجات</Text>
          {items.map((it: any, i: number) => {
            const qty = it.quantity ?? 1;
            const unit = it.unitPrice ?? it.price ?? null;
            const line = it.total ?? (unit !== null ? Number(unit) * Number(qty) : null);
            return (
              <View key={it.id || i} style={{ gap: 2 }}>
                <View style={[s.row, { justifyContent: 'space-between' }]}>
                  <Text style={[s.txt, { fontWeight: '600', flexShrink: 1 }]}>{it.productName || 'منتج'}</Text>
                  <Text style={[s.txt, { fontWeight: '700' }]}>{line !== null ? dzd(line) : ''}</Text>
                </View>
                <Text style={s.sub}>{[it.variantLabel, it.sku].filter(Boolean).join(' · ')}{unit !== null ? ` · ${dzd(unit)} × ${qty}` : ` · × ${qty}`}</Text>
              </View>
            );
          })}
        </Card>
      ) : null}

      <Card style={{ gap: 8 }}>
        <Text style={s.h2}>الزبون والتوصيل</Text>
        <KV k="الاسم" v={order.customerName} bold />
        <KV k="الهاتف" v={order.phone} />
        {place ? <KV k="الولاية — البلدية" v={place} /> : <KV k="الولاية" v={order.wilayaId ? `ولاية رقم ${order.wilayaId}` : null} />}
        <KV k="العنوان" v={order.address || order.city} />
        <KV k="نوع التوصيل" v={order.deliveryType === 'desk' ? 'إلى المكتب' : 'إلى المنزل'} />
        <KV k="طريقة التوصيل" v={order.deliveryMethod === 'driver' ? 'سائق' : order.deliveryMethod === 'company' ? 'شركة توصيل' : order.deliveryMethod} />
        <KV k="السائق" v={order.driverName} />
        <KV k="رقم التتبع" v={order.trackingNumber} />
        <KV k="ملاحظات" v={order.notes} />
        <View style={[s.row, { marginTop: 6 }]}>
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(139,170,150,0.25)', borderRadius: 14, paddingVertical: 11, alignItems: 'center' }} onPress={() => order.phone && Linking.openURL(`tel:${order.phone}`)}>
            <Text style={{ color: '#2E4B38', fontWeight: '700', fontSize: 14 }}>اتصال</Text>
          </Pressable>
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(139,170,150,0.18)', borderRadius: 14, paddingVertical: 11, alignItems: 'center' }} onPress={() => order.phone && Linking.openURL(`https://wa.me/${waNumber(order.phone)}`)}>
            <Text style={{ color: '#2E4B38', fontWeight: '700', fontSize: 14 }}>WhatsApp</Text>
          </Pressable>
        </View>
      </Card>

      <Card style={{ gap: 8 }}>
        <Text style={s.h2}>الحساب</Text>
        <KV k="المجموع الفرعي" v={dzd(order.price)} />
        <KV k="رسوم التوصيل" v={dzd(order.deliveryFee)} />
        <KV k="الإجمالي عند الاستلام" v={dzd(orderTotalOf(order))} bold />
        <View style={{ gap: 8, marginTop: 4 }}>
          <GlassButton title="مشاركة ملخص الطلب" variant="green" small onPress={shareSummary} />
          <GlassButton title="إرسال حالة الطلب للعميل (واتساب)" variant="green" small onPress={sendStatusWa} />
        </View>
      </Card>

      <Card style={{ gap: 10 }}>
        <Text style={s.h2}>تغيير الحالة</Text>
        {next ? (
          <Pressable disabled={busy} onPress={() => setStatus(next)} style={{ backgroundColor: 'rgba(130,154,137,0.85)', borderRadius: 999, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(110,134,118,0.5)', shadowColor: '#829A89', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, opacity: busy ? 0.6 : 1 }}>
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>التالي: {STATUS_LABEL[next]}</Text>
          </Pressable>
        ) : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {ALL_STATUSES.filter((k) => k !== order.status).map((k) => (
            <Pressable key={k} disabled={busy} onPress={() => setStatus(k)} style={{ borderColor: STATUS_COLOR[k] + '73', backgroundColor: STATUS_COLOR[k] + '1A', borderWidth: 0.8, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 }}>
              <Text style={{ color: STATUS_COLOR[k], fontWeight: '600', fontSize: 13 }}>{STATUS_LABEL[k]}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Pressable onPress={() => router.back()}>
        <Text style={[s.sub, { textAlign: 'center' }]}>رجوع</Text>
      </Pressable>
    </ScrollView>
  );
}
