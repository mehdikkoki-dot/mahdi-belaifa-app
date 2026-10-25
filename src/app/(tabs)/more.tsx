import { useFocusEffect, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import React, { useCallback, useState } from 'react';
import { Image, ImageBackground, Pressable, ScrollView, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { api } from '../../lib/api';
import { BOTTOM_PAD, C, HERO_DARK, s, SoftIcon, useTopPad } from '../../components/ui';

const DASHBOARD_URL = 'https://codflow-dashboard.basatbelaifa7.workers.dev';

export default function More() {
  const router = useRouter();
  const top = useTopPad();
  const [store, setStore] = useState<any>(null);
  const load = useCallback(async () => { try { setStore(await api.store()); } catch { /* ignore */ } }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const GRow = ({ icon, tint, color, title, sub, onPress, last }: any) => (
    <Pressable onPress={onPress}>
      <View style={[s.row, { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: last ? 0 : 0.5, borderBottomColor: C.hairline }]}>
        <SoftIcon name={icon} tint={tint} color={color} size={36} radius={11} glyph={15} />
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={[s.txt, { fontWeight: '600', fontSize: 14.5 }]}>{title}</Text>
          <Text style={[s.sub, { fontSize: 12 }]}>{sub}</Text>
        </View>
        <Text style={{ color: C.tertiary, fontSize: 17 }}>{'‹'}</Text>
      </View>
    </Pressable>
  );
  const Group = ({ title, children }: any) => (
    <View style={{ gap: 8 }}>
      <Text style={{ color: '#4A4F4C', fontWeight: '700', fontSize: 13.5, textAlign: 'right', paddingHorizontal: 4 }}>{title}</Text>
      <View style={{ backgroundColor: '#FFFFFF', borderRadius: 22, borderWidth: 0.5, borderColor: 'rgba(41,45,48,0.06)', shadowColor: '#3A4038', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, overflow: 'hidden' }}>
        {children}
      </View>
    </View>
  );

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ paddingBottom: BOTTOM_PAD }}>
      <ImageBackground source={HERO_DARK} resizeMode="cover" style={{ paddingTop: top + 6, paddingHorizontal: 16, paddingBottom: 30 }}>
        <View style={[s.row, { justifyContent: 'space-between' }]}>
          <Text style={{ color: 'rgba(255,255,255,0.0)', fontSize: 13 }}>·</Text>
          <Pressable onPress={() => router.push('/settings' as any)} hitSlop={8}>
            <View style={{ width: 38, height: 38, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' }}>
              <SymbolView name="gearshape.fill" size={17} tintColor="#FFFFFF" />
            </View>
          </Pressable>
        </View>
        <View style={[s.row, { marginTop: 10 }]}>
          {store?.logoUrl ? <Image source={{ uri: store.logoUrl }} style={{ width: 62, height: 62, borderRadius: 999, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' }} /> : null}
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 19, fontWeight: '800', textAlign: 'right' }}>{store?.name || 'Mahdi Belaifa'}</Text>
              <SymbolView name="checkmark.seal.fill" size={15} tintColor="#A9D3B4" />
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12.5, textAlign: 'right' }}>صاحب المتجر</Text>
          </View>
        </View>
      </ImageBackground>

      <View style={{ paddingHorizontal: 16, marginTop: -18, gap: 16 }}>
        <Pressable onPress={() => Linking.openURL(DASHBOARD_URL)}>
          <View style={[s.row, { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 13, borderWidth: 0.5, borderColor: 'rgba(41,45,48,0.06)', shadowColor: '#3A4038', shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 5 } }]}>
            {store?.logoUrl ? <Image source={{ uri: store.logoUrl }} style={{ width: 40, height: 40, borderRadius: 12 }} /> : <SoftIcon name="storefront.fill" size={40} radius={12} glyph={16} />}
            <View style={{ flex: 1, gap: 1 }}>
              <Text style={[s.txt, { fontWeight: '700', fontSize: 14.5 }]}>متجري</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <View style={{ width: 7, height: 7, borderRadius: 99, backgroundColor: '#7FA98C' }} />
                <Text style={[s.sub, { fontSize: 12 }]}>نشط — افتح لوحة الويب</Text>
              </View>
            </View>
            <Text style={{ color: C.tertiary, fontSize: 17 }}>{'‹'}</Text>
          </View>
        </Pressable>

        <Group title="إدارة المتجر">
          <GRow icon="shippingbox.fill" tint="rgba(130,152,137,0.14)" color="#5F7A68" title="المنتجات" sub="إدارة المنتجات والمخزون" onPress={() => router.push('/(tabs)/products' as any)} />
          <GRow icon="bag.fill" tint="rgba(130,149,167,0.14)" color="#5F7488" title="الطلبات" sub="متابعة ومعالجة الطلبات" onPress={() => router.push('/(tabs)/orders' as any)} />
          <GRow icon="chart.bar.fill" tint="rgba(195,161,106,0.15)" color="#A5814C" title="الأرباح" sub="التقارير والتحليلات المالية" onPress={() => router.push('/(tabs)/profit' as any)} />
          <GRow icon="tag.fill" tint="rgba(190,141,141,0.13)" color="#A96F6F" title="العروض والخصومات" sub="عروض المتجر النشطة" onPress={() => router.push('/offers' as any)} last />
        </Group>

        <Group title="العملاء والتوصيل">
          <GRow icon="person.2.fill" tint="rgba(130,152,137,0.14)" color="#5F7A68" title="العملاء" sub="إدارة بيانات العملاء" onPress={() => router.push('/customers' as any)} />
          <GRow icon="truck.box.fill" tint="rgba(130,149,167,0.14)" color="#5F7488" title="شركات التوصيل" sub="إعدادات وشركات التوصيل" onPress={() => router.push('/delivery' as any)} />
          <GRow icon="sun.max.fill" tint="rgba(195,161,106,0.15)" color="#A5814C" title="توصيل اليوم" sub="طلبات جاهزة للخروج، بالبلدية" onPress={() => router.push('/today' as any)} />
          <GRow icon="tray.fill" tint="rgba(190,141,141,0.13)" color="#A96F6F" title="الطلبات المهجورة" sub="طلبات لم تُكمل وإحصائياتها" onPress={() => router.push('/abandoned' as any)} last />
        </Group>

        <Group title="الإعدادات والدعم">
          <GRow icon="gearshape.fill" tint="#EFEDE7" color="#5A5E58" title="الإعدادات" sub="تخصيص التطبيق والمتجر" onPress={() => router.push('/settings' as any)} />
          <GRow icon="star.fill" tint="rgba(195,161,106,0.15)" color="#A5814C" title="التقييمات" sub="آراء العملاء في المنتجات" onPress={() => router.push('/reviews' as any)} />
          <GRow icon="magnifyingglass" tint="rgba(130,149,167,0.14)" color="#5F7488" title="بحث شامل" sub="في الطلبات والعملاء والمنتجات" onPress={() => router.push('/search' as any)} />
          <GRow icon="globe" tint="rgba(130,152,137,0.14)" color="#5F7A68" title="صفحة الهبوط" sub="صفحة بيع الحزام" onPress={() => Linking.openURL('https://mahdi-belaifa-landing.basatbelaifa7.workers.dev')} last />
        </Group>

        <Text style={[s.sub, { textAlign: 'center', fontSize: 12 }]}>SOUR — إدارة متجرك بهدوء</Text>
      </View>
    </ScrollView>
  );
}
