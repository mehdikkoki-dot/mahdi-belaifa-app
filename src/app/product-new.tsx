import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, Text } from 'react-native';
import { api } from '../lib/api';
import { BOTTOM_PAD, Card, s } from '../components/ui';
import { ChipRow, Field, SaveButton } from '../components/form';

export default function ProductNew() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [compareAt, setCompareAt] = useState('');
  const [sku, setSku] = useState('');
  const [inventory, setInventory] = useState('0');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim()) return Alert.alert('تنبيه', 'اسم المنتج مطلوب');
    if (!price || Number(price) <= 0) return Alert.alert('تنبيه', 'أدخل سعراً صحيحاً');
    if (!sku.trim()) return Alert.alert('تنبيه', 'رمز SKU مطلوب للمنتجات البسيطة');
    setBusy(true);
    try {
      const created = await api.createProduct({
        name: name.trim(),
        price: Number(price),
        compareAtPrice: compareAt ? Number(compareAt) : undefined,
        sku: sku.trim(),
        inventory: Number(inventory) || 0,
        description: description.trim() || undefined,
        status,
        type: 'PHYSICAL',
      });
      Alert.alert('تم', 'تمت إضافة المنتج', [{ text: 'حسناً', onPress: () => (created?.id ? router.replace(`/product/${created.id}` as any) : router.back()) }]);
    } catch { Alert.alert('خطأ', 'تعذر إضافة المنتج. تحقق من المعلومات (SKU يجب أن يكون فريداً).'); }
    setBusy(false);
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.content, { paddingBottom: BOTTOM_PAD }]} keyboardShouldPersistTaps="handled">
      <Card style={{ gap: 12 }}>
        <Text style={s.h2}>منتج جديد</Text>
        <Field label="اسم المنتج *" value={name} onChange={setName} placeholder="مثال: حزام جانبي مرن — زوج" />
        <Field label="السعر (دج) *" value={price} onChange={setPrice} placeholder="1400" keyboard="numeric" />
        <Field label="سعر المقارنة (دج)" value={compareAt} onChange={setCompareAt} placeholder="2000 (يظهر مشطوباً)" keyboard="numeric" />
        <Field label="رمز SKU *" value={sku} onChange={setSku} placeholder="CEINT-NOIR" />
        <Field label="المخزون" value={inventory} onChange={setInventory} placeholder="0" keyboard="numeric" />
        <Field label="الوصف" value={description} onChange={setDescription} placeholder="وصف قصير للمنتج..." multiline />
        <ChipRow options={[{ value: 'ACTIVE', label: 'مفعّل' }, { value: 'DRAFT', label: 'مسودة' }]} value={status} onChange={setStatus} />
      </Card>
      <SaveButton title="إضافة المنتج" busy={busy} onPress={submit} />
    </ScrollView>
  );
}
