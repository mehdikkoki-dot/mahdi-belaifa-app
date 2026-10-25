import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, Switch, Text, View } from 'react-native';
import { api, dzd } from '../lib/api';
import { LOCK_KEY } from '../lib/cache';
import { BOTTOM_PAD, C, Card, KV, s } from '../components/ui';

export default function Settings() {
  const [store, setStore] = useState<any>(null);
  const [pixel, setPixel] = useState<any>(null);
  const [lock, setLock] = useState(false);
  const [bioOk, setBioOk] = useState(false);

  const load = useCallback(async () => {
    try { setStore(await api.store()); } catch { /* ignore */ }
    try { setPixel(await api.pixelConfig()); } catch { /* ignore */ }
    try {
      setLock((await AsyncStorage.getItem(LOCK_KEY)) === '1');
      setBioOk((await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync()));
    } catch { /* ignore */ }
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggleLock = async (v: boolean) => {
    if (v) {
      const res = await LocalAuthentication.authenticateAsync({ promptMessage: 'تفعيل قفل التطبيق' }).catch(() => null);
      if (!res?.success) { Alert.alert('تنبيه', 'يلزم تأكيد هويتك لتفعيل القفل'); return; }
    }
    setLock(v);
    await AsyncStorage.setItem(LOCK_KEY, v ? '1' : '0');
  };

  const px = pixel?.data || pixel || {};
  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.content, { paddingBottom: BOTTOM_PAD }]}>
      <Card style={{ gap: 8 }}>
        <Text style={s.h2}>المتجر</Text>
        <KV k="الاسم" v={store?.name} bold />
        <KV k="البريد" v={store?.email || store?.ownerEmail} />
        <KV k="الهاتف" v={store?.phone} />
        <KV k="العملة" v={store?.currency} />
        <KV k="حد الشحن المجاني" v={store?.freeShippingThreshold ? dzd(store.freeShippingThreshold) : null} />
      </Card>
      <Card style={{ gap: 8 }}>
        <Text style={s.h2}>تتبع الإعلانات (Meta Pixel)</Text>
        <KV k="الحالة" v={px?.pixelId ? 'مربوط' : 'غير مربوط بعد'} bold />
        <KV k="معرّف البكسل" v={px?.pixelId ? String(px.pixelId) : null} />
        <KV k="CAPI" v={px?.capiEnabled !== undefined ? (px.capiEnabled ? 'مفعّل' : 'غير مفعّل') : null} />
        {!px?.pixelId ? <Text style={s.sub}>الربط يتم من لوحة الويب (الإعدادات ← البكسل) أو أرسل لي معرّف البكسل وسأربطه لك.</Text> : null}
      </Card>
      <Card style={{ gap: 10 }}>
        <Text style={s.h2}>الأمان</Text>
        <View style={[s.row, { justifyContent: 'space-between' }]}>
          <View style={s.grow}>
            <Text style={[s.txt, { fontWeight: '600' }]}>قفل التطبيق بـ Face ID</Text>
            <Text style={s.sub}>{bioOk ? 'يُطلب التحقق عند فتح التطبيق' : 'Face ID غير مهيأ على هذا الجهاز'}</Text>
          </View>
          <Switch value={lock} onValueChange={toggleLock} disabled={!bioOk} trackColor={{ true: C.accent, false: 'rgba(255,255,255,0.15)' }} />
        </View>
      </Card>
      <Card style={{ gap: 4 }}>
        <Text style={s.h2}>حول</Text>
        <Text style={s.sub}>Mahdi Belaifa — تطبيق إدارة الطلبات (COD). بدون إنترنت، يعرض التطبيق آخر بيانات محفوظة.</Text>
      </Card>
    </ScrollView>
  );
}
