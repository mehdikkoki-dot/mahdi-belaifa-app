import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, Text } from 'react-native';
import { api } from '../lib/api';
import { BOTTOM_PAD, Card, s } from '../components/ui';
import { Field, PickerField, SaveButton } from '../components/form';

export default function CustomerNew() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const editing = !!id;
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [phone2, setPhone2] = useState('');
  const [wilayas, setWilayas] = useState<any[]>([]);
  const [communes, setCommunes] = useState<any[]>([]);
  const [wilayaId, setWilayaId] = useState<number | null>(null);
  const [communeId, setCommuneId] = useState('');
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);

  const loadCommunes = useCallback(async (w: number) => {
    try { setCommunes(await api.communes(w)); } catch { setCommunes([]); }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setWilayas(await api.wilayas());
        if (id) {
          const all = await api.customers();
          const c = all.find((x) => x.id === id);
          if (c) {
            setName(c.name || ''); setPhone(c.phone || ''); setPhone2(c.phone2 || '');
            setAddress(c.address || '');
            if (c.wilayaId) { setWilayaId(c.wilayaId); await loadCommunes(c.wilayaId); }
            if (c.communeId) setCommuneId(c.communeId);
          }
        }
      } catch { /* ignore */ }
    })();
  }, [id, loadCommunes]);

  const submit = async () => {
    if (!name.trim()) return Alert.alert('تنبيه', 'الاسم مطلوب');
    if (!/^0[567]\d{8}$/.test(phone.trim())) return Alert.alert('تنبيه', 'رقم هاتف غير صحيح');
    if (!wilayaId) return Alert.alert('تنبيه', 'اختر الولاية');
    if (!communeId) return Alert.alert('تنبيه', 'اختر البلدية');
    setBusy(true);
    try {
      const body = { name: name.trim(), phone: phone.trim(), phone2: phone2.trim() || null, wilayaId, communeId, address: address.trim() || undefined };
      if (editing) { await api.updateCustomer(id!, body); Alert.alert('تم', 'تم تحديث العميل', [{ text: 'حسناً', onPress: () => router.back() }]); }
      else {
        const created = await api.createCustomer(body);
        Alert.alert('تم', 'تمت إضافة العميل', [{ text: 'حسناً', onPress: () => (created?.id ? router.replace(`/customer/${created.id}` as any) : router.back()) }]);
      }
    } catch { Alert.alert('خطأ', 'تعذر الحفظ. حاول مجدداً.'); }
    setBusy(false);
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.content, { paddingBottom: BOTTOM_PAD }]} keyboardShouldPersistTaps="handled">
      <Card style={{ gap: 12 }}>
        <Text style={s.h2}>{editing ? 'تعديل العميل' : 'عميل جديد'}</Text>
        <Field label="الاسم *" value={name} onChange={setName} placeholder="الاسم الكامل" />
        <Field label="رقم الهاتف *" value={phone} onChange={setPhone} placeholder="05/06/07........" keyboard="phone-pad" />
        <Field label="هاتف ثانٍ" value={phone2} onChange={setPhone2} placeholder="اختياري" keyboard="phone-pad" />
        <PickerField label="الولاية *" valueLabel={wilayas.find((w) => w.id === wilayaId)?.nameAr} placeholder="اختر الولاية" items={wilayas.map((w) => ({ id: String(w.id), label: w.nameAr || w.name, sub: w.name }))} onPick={(i) => { const wid = Number(i.id); setWilayaId(wid); setCommuneId(''); setCommunes([]); loadCommunes(wid); }} />
        <PickerField label="البلدية *" valueLabel={communes.find((c) => c.id === communeId)?.nameAr} placeholder={wilayaId ? 'اختر البلدية' : 'اختر الولاية أولاً'} items={communes.map((c) => ({ id: c.id, label: c.nameAr || c.name, sub: c.name }))} onPick={(i) => setCommuneId(i.id)} />
        <Field label="العنوان" value={address} onChange={setAddress} placeholder="الحي، الشارع..." />
      </Card>
      <SaveButton title={editing ? 'حفظ التعديلات' : 'إضافة العميل'} busy={busy} onPress={submit} />
    </ScrollView>
  );
}
