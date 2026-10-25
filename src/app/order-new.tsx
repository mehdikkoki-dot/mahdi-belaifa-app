import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { api, dzd, uuidv4, variantLabel } from '../lib/api';
import { BOTTOM_PAD, C, Card, KV, s } from '../components/ui';
import { ChipRow, Field, PickerField, QtyStepper, SaveButton } from '../components/form';

interface Line { productId: string; productName: string; variantId?: string; variantLabel?: string; quantity: number; pricePerUnit: number; lineTotal: number }

export default function OrderNew() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [wilayas, setWilayas] = useState<any[]>([]);
  const [communes, setCommunes] = useState<any[]>([]);
  const [wilayaId, setWilayaId] = useState<number | null>(null);
  const [communeId, setCommuneId] = useState<string>('');
  const [address, setAddress] = useState('');
  const [deliveryType, setDeliveryType] = useState<'home' | 'desk'>('home');
  const [rules, setRules] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [productId, setProductId] = useState('');
  const [variantId, setVariantId] = useState('');
  const [qty, setQty] = useState(1);
  const [lines, setLines] = useState<Line[]>([]);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [w, r, p, c] = await Promise.all([api.wilayas(), api.shippingRules(), api.products(), api.customers()]);
        setWilayas(w); setRules(r); setProducts(p); setCustomers(c);
      } catch { /* ignore */ }
    })();
  }, []);

  const loadCommunes = useCallback(async (w: number) => {
    try { setCommunes(await api.communes(w)); } catch { setCommunes([]); }
  }, []);

  const product = useMemo(() => products.find((p) => p.id === productId) || null, [products, productId]);
  const variants: any[] = product?.variants || [];
  const variant = useMemo(() => variants.find((v) => v.id === variantId) || null, [variants, variantId]);
  const unitPrice = variant?.price ?? product?.price ?? 0;

  const rule = useMemo(() => rules.find((r) => r.wilayaId === wilayaId) || null, [rules, wilayaId]);
  const deliveryFee = useMemo(() => {
    if (!rule) return 0;
    return deliveryType === 'home' ? (rule.homeEnabled ? rule.homePrice : 0) : (rule.stopDeskEnabled ? rule.stopDeskPrice : 0);
  }, [rule, deliveryType]);
  const subtotal = lines.reduce((a, l) => a + l.lineTotal, 0);

  const addLine = () => {
    if (!product) { Alert.alert('تنبيه', 'اختر المنتج أولاً'); return; }
    if (variants.length > 0 && !variant) { Alert.alert('تنبيه', 'اختر خيار المنتج'); return; }
    const line: Line = {
      productId: product.id,
      productName: product.name,
      variantId: variant?.id,
      variantLabel: variant ? variantLabel(variant) : undefined,
      quantity: qty,
      pricePerUnit: Number(unitPrice) || 0,
      lineTotal: (Number(unitPrice) || 0) * qty,
    };
    setLines([...lines, line]);
    setProductId(''); setVariantId(''); setQty(1);
  };

  const submit = async () => {
    if (!name.trim()) return Alert.alert('تنبيه', 'اسم الزبون مطلوب');
    if (!/^0[567]\d{8}$/.test(phone.trim())) return Alert.alert('تنبيه', 'رقم هاتف غير صحيح (يبدأ بـ 05/06/07 و10 أرقام)');
    if (!wilayaId) return Alert.alert('تنبيه', 'اختر الولاية');
    if (!communeId) return Alert.alert('تنبيه', 'اختر البلدية');
    if (lines.length === 0) return Alert.alert('تنبيه', 'أضف منتجاً واحداً على الأقل');
    setBusy(true);
    try {
      const existing = customers.find((c) => c.phone === phone.trim());
      const created = await api.createOrder({
        customerId: existing?.id || uuidv4(),
        customerName: name.trim(),
        phone: phone.trim(),
        wilayaId,
        communeId,
        address: address.trim() || undefined,
        price: subtotal,
        notes: notes.trim() || undefined,
        orderType: 'online',
        deliveryType,
        deliveryFee,
        products: lines,
      });
      Alert.alert('تم', 'تم إنشاء الطلب بنجاح', [
        { text: 'حسناً', onPress: () => (created?.id ? router.replace(`/order/${created.id}` as any) : router.back()) },
      ]);
    } catch (e: any) {
      Alert.alert('خطأ', 'تعذر إنشاء الطلب. تحقق من المعلومات وحاول مجدداً.');
    }
    setBusy(false);
  };

  const wilayaName = wilayas.find((w) => w.id === wilayaId)?.nameAr;
  const communeName = communes.find((c) => c.id === communeId)?.nameAr;

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.content, { paddingBottom: BOTTOM_PAD }]} keyboardShouldPersistTaps="handled">
      <Card style={{ gap: 12 }}>
        <Text style={s.h2}>الزبون</Text>
        <Field label="اسم الزبون *" value={name} onChange={setName} placeholder="الاسم الكامل" />
        <Field label="رقم الهاتف *" value={phone} onChange={setPhone} placeholder="05/06/07........" keyboard="phone-pad" />
        <PickerField label="الولاية *" valueLabel={wilayaName} placeholder="اختر الولاية" items={wilayas.map((w) => ({ id: String(w.id), label: w.nameAr || w.name, sub: w.name }))} onPick={(i) => { const id = Number(i.id); setWilayaId(id); setCommuneId(''); setCommunes([]); loadCommunes(id); }} />
        <PickerField label="البلدية *" valueLabel={communeName} placeholder={wilayaId ? 'اختر البلدية' : 'اختر الولاية أولاً'} items={communes.map((c) => ({ id: c.id, label: c.nameAr || c.name, sub: c.name }))} onPick={(i) => setCommuneId(i.id)} />
        <Field label="العنوان" value={address} onChange={setAddress} placeholder="الحي، الشارع، علامة مميزة..." />
        <View style={{ gap: 6 }}>
          <Text style={[s.sub, { color: C.label, fontWeight: '600' }]}>نوع التوصيل</Text>
          <ChipRow options={[{ value: 'home', label: 'إلى المنزل' }, { value: 'desk', label: 'إلى المكتب' }]} value={deliveryType} onChange={(v) => setDeliveryType(v as any)} />
        </View>
        {wilayaId ? <Text style={s.sub}>رسوم التوصيل: {rule ? dzd(deliveryFee) : 'غير متوفرة لهذه الولاية'}</Text> : null}
      </Card>

      <Card style={{ gap: 12 }}>
        <Text style={s.h2}>المنتجات</Text>
        {lines.map((l, i) => (
          <View key={i} style={[s.row, { justifyContent: 'space-between' }]}>
            <View style={s.grow}>
              <Text style={[s.txt, { fontWeight: '600' }]}>{l.productName}</Text>
              <Text style={s.sub}>{[l.variantLabel, `${dzd(l.pricePerUnit)} × ${l.quantity}`].filter(Boolean).join(' · ')}</Text>
            </View>
            <Text style={[s.txt, { fontWeight: '700' }]}>{dzd(l.lineTotal)}</Text>
            <Pressable onPress={() => setLines(lines.filter((_, j) => j !== i))} style={{ backgroundColor: 'rgba(197,143,143,0.18)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 }}>
              <Text style={{ color: '#A85F5F', fontWeight: '700', fontSize: 12.5 }}>حذف</Text>
            </Pressable>
          </View>
        ))}
        <PickerField label="المنتج" valueLabel={product?.name} placeholder="اختر منتجاً" items={products.map((p) => ({ id: p.id, label: p.name, sub: dzd(p.price) }))} onPick={(i) => { setProductId(i.id); setVariantId(''); }} />
        {variants.length > 0 ? (
          <View style={{ gap: 6 }}>
            <Text style={[s.sub, { color: C.label, fontWeight: '600' }]}>الخيار</Text>
            <ChipRow options={variants.map((v) => ({ value: v.id, label: variantLabel(v) || v.sku || 'خيار' }))} value={variantId} onChange={setVariantId} />
          </View>
        ) : null}
        <View style={[s.row, { justifyContent: 'space-between' }]}>
          <Text style={[s.sub, { color: C.label, fontWeight: '600' }]}>الكمية</Text>
          <QtyStepper qty={qty} setQty={setQty} />
        </View>
        {product ? <Text style={s.sub}>سعر الوحدة: {dzd(unitPrice)}</Text> : null}
        <Pressable onPress={addLine} style={{ backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: 'rgba(41,45,50,0.12)', borderRadius: 14, paddingVertical: 11, alignItems: 'center' }}>
          <Text style={{ color: C.label, fontWeight: '700' }}>+ أضف إلى الطلب</Text>
        </Pressable>
      </Card>

      <Card style={{ gap: 12 }}>
        <Field label="ملاحظات" value={notes} onChange={setNotes} placeholder="أي تفاصيل إضافية..." multiline />
        <KV k="المجموع الفرعي" v={dzd(subtotal)} />
        <KV k="التوصيل" v={dzd(deliveryFee)} />
        <KV k="الإجمالي عند الاستلام" v={dzd(subtotal + deliveryFee)} bold />
      </Card>

      <SaveButton title="إنشاء الطلب" busy={busy} onPress={submit} />
    </ScrollView>
  );
}
