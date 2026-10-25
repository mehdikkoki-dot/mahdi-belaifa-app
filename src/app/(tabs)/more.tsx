import { useFocusEffect, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { api } from '../../lib/api';
import { BOTTOM_PAD, Card, s, useTopPad } from '../../components/ui';

const DASHBOARD_URL = 'https://codflow-dashboard.basatbelaifa7.workers.dev';

export default function More() {
  const router = useRouter();
  const top = useTopPad();
  const [store, setStore] = useState<any>(null);
  const load = useCallback(async () => { try { setStore(await api.store()); } catch { /* ignore */ } }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const Row = ({ title, sub, onPress }: any) => (
    <Pressable onPress={onPress}>
      <Card>
        <Text style={[s.txt, { fontWeight: '600' }]}>{title}</Text>
        {sub ? <Text style={s.sub}>{sub}</Text> : null}
      </Card>
    </Pressable>
  );

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.content, { paddingTop: top, paddingBottom: BOTTOM_PAD }]}>
      <Text style={s.h1}>المزيد</Text>
      <Card style={{ alignItems: 'center', gap: 6, paddingVertical: 22 }}>
        <Text style={[s.h2, { fontSize: 20 }]}>{store?.name || 'Mahdi Belaifa'}</Text>
        <Text style={s.sub}>لوحة تحكم الطلبات</Text>
      </Card>
      <Row title="العروض والخصومات" sub="عروض المتجر النشطة" onPress={() => router.push('/offers' as any)} />
      <Row title="الطلبات المهجورة" sub="طلبات لم تُكمل وإحصائياتها" onPress={() => router.push('/abandoned' as any)} />
      <Row title="المخزون" sub="نظرة عامة على مخزون المنتجات" onPress={() => router.push('/stock' as any)} />
      <Row title="الشحن والتوصيل" sub="ملفات الشحن، الشركات، والسائقون" onPress={() => router.push('/delivery' as any)} />
      <Row title="فتح لوحة الويب" sub="نفس اللوحة في المتصفح" onPress={() => Linking.openURL(DASHBOARD_URL)} />
      <Row title="صفحة الهبوط" sub="صفحة بيع الحزام" onPress={() => Linking.openURL('https://mahdi-belaifa-landing.basatbelaifa7.workers.dev')} />
      <Card>
        <Text style={s.txt}>حول التطبيق</Text>
        <Text style={s.sub}>تطبيق إدارة طلبات متجر Mahdi Belaifa — الدفع عند الاستلام. نفس محتوى لوحة الويب، بشريط زجاجي أصلي من iOS.</Text>
      </Card>
      <Text style={[s.sub, { textAlign: 'center' }]}>Mahdi Belaifa · Expo</Text>
    </ScrollView>
  );
}
