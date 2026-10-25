import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, View } from 'react-native';
import { api, variantLabel } from '../../lib/api';
import { BOTTOM_PAD, C, Card, s } from '../../components/ui';
import { ChipRow, Field, SaveButton } from '../../components/form';

export default function ProductEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [compareAt, setCompareAt] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [inventory, setInventory] = useState('');
  const [variantEdits, setVariantEdits] = useState<Record<string, { price: string; inventory: string }>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const all = await api.products();
        const p = all.find((x) => x.id === id) || null;
        setProduct(p);
        if (p) {
          setName(p.name || ''); setPrice(String(p.price ?? '')); setCompareAt(p.compareAtPrice ? String(p.compareAtPrice) : '');
          setDescription(p.descriptionPlain || p.description || ''); setStatus(p.status || 'ACTIVE');
          setInventory(String(p.inventory ?? ''));
          const ve: Record<string, { price: string; inventory: string }> = {};
          (p.variants || []).forEach((v: any) => { ve[v.id] = { price: String(v.price ?? ''), inventory: String(v.inventory ?? '') }; });
          setVariantEdits(ve);
        }
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [id]);

  const submit = async () => {
    if (!product) return;
    if (!name.trim()) return Alert.alert('تنبيه', 'الاسم مطلوب');
    if (!price || Number(price) <= 0) return Alert.alert('تنبيه', 'أدخل سعراً صحيحاً');
    setBusy(true);
    try {
      await api.updateProduct(product.id, {
        name: name.trim(),
        price: Number(price),
        compareAtPrice: compareAt ? Number(compareAt) : null,
        description: description.trim(),
        ...(product.hasVariants ? {} : { inventory: Number(inventory) || 0 }),
      });
      if (status !== product.status) await api.updateProductStatus(product.id, status);
      for (const v of product.variants || []) {
        const e = variantEdits[v.id];
        if (!e) continue;
        const body: any = {};
        if (e.price !== String(v.price ?? '')) body.price = Number(e.price);
        if (e.inventory !== String(v.inventory ?? '')) body.inventory = Number(e.inventory) || 0;
        if (Object.keys(body).length) await api.updateVariant(product.id, v.id, body);
      }
      Alert.alert('تم', 'تم حفظ التعديلات', [{ text: 'حسناً', onPress: () => router.back() }]);
    } catch { Alert.alert('خطأ', 'تعذر الحفظ. حاول مجدداً.'); }
    setBusy(false);
  };

  if (loading) return <View style={[s.screen, { justifyContent: 'center' }]}><ActivityIndicator size="large" color={C.accent} /></View>;
  if (!product) return <View style={s.screen}><Text style={[s.txt, { padding: 16 }]}>المنتج غير موجود.</Text></View>;

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.content, { paddingBottom: BOTTOM_PAD }]} keyboardShouldPersistTaps="handled">
      <Card style={{ gap: 12 }}>
        <Text style={s.h2}>تعديل المنتج</Text>
        <Field label="اسم المنتج *" value={name} onChange={setName} />
        <Field label="السعر (دج) *" value={price} onChange={setPrice} keyboard="numeric" />
        <Field label="سعر المقارنة (دج)" value={compareAt} onChange={setCompareAt} keyboard="numeric" />
        <Field label="الوصف" value={description} onChange={setDescription} multiline />
        <ChipRow options={[{ value: 'ACTIVE', label: 'مفعّل' }, { value: 'DRAFT', label: 'مسودة' }]} value={status} onChange={setStatus} />
        {!product.hasVariants ? <Field label="المخزون" value={inventory} onChange={setInventory} keyboard="numeric" /> : null}
      </Card>
      {product.hasVariants && (product.variants || []).length > 0 ? (
        <Card style={{ gap: 14 }}>
          <Text style={s.h2}>الخيارات: السعر والمخزون</Text>
          {(product.variants || []).map((v: any) => (
            <View key={v.id} style={{ gap: 8 }}>
              <Text style={[s.txt, { fontWeight: '600' }]}>{variantLabel(v) || v.sku || 'خيار'}</Text>
              <Field label="السعر (دج)" value={variantEdits[v.id]?.price || ''} onChange={(val) => setVariantEdits({ ...variantEdits, [v.id]: { ...variantEdits[v.id], price: val } })} keyboard="numeric" />
              <Field label="المخزون" value={variantEdits[v.id]?.inventory || ''} onChange={(val) => setVariantEdits({ ...variantEdits, [v.id]: { ...variantEdits[v.id], inventory: val } })} keyboard="numeric" />
            </View>
          ))}
        </Card>
      ) : null}
      <SaveButton title="حفظ التعديلات" busy={busy} onPress={submit} />
    </ScrollView>
  );
}
