import { Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import React from 'react';
import { I18nManager, Pressable, Text, View } from 'react-native';
import { LOCK_KEY } from '../lib/cache';

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

function LockGate({ children }: { children: React.ReactNode }) {
  const [locked, setLocked] = React.useState<boolean | null>(null);
  const check = React.useCallback(async () => {
    try {
      const on = (await AsyncStorage.getItem(LOCK_KEY)) === '1';
      if (!on) { setLocked(false); return; }
      const ok = (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
      if (!ok) { setLocked(false); return; }
      const res = await LocalAuthentication.authenticateAsync({ promptMessage: 'فتح تطبيق SOUR', cancelLabel: 'إلغاء' });
      setLocked(!res.success);
    } catch { setLocked(false); }
  }, []);
  React.useEffect(() => { check(); }, [check]);
  if (locked === null) return <View style={{ flex: 1, backgroundColor: '#000' }} />;
  if (locked) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
        <Text style={{ color: '#F5F5F7', fontSize: 20, fontWeight: '700' }}>التطبيق مقفل</Text>
        <Pressable onPress={check} style={{ backgroundColor: '#ED2929', borderRadius: 14, paddingHorizontal: 22, paddingVertical: 12 }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>فتح بـ Face ID</Text>
        </Pressable>
      </View>
    );
  }
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <LockGate>
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#000000' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: '#000000' },
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="order/[id]" options={{ title: 'تفاصيل الطلب' }} />
      <Stack.Screen name="product/[id]" options={{ title: 'المنتج' }} />
      <Stack.Screen name="customer/[id]" options={{ title: 'العميل' }} />
      <Stack.Screen name="offers" options={{ title: 'العروض والخصومات' }} />
      <Stack.Screen name="abandoned" options={{ title: 'الطلبات المهجورة' }} />
      <Stack.Screen name="stock" options={{ title: 'المخزون' }} />
      <Stack.Screen name="delivery" options={{ title: 'الشحن والتوصيل' }} />
      <Stack.Screen name="order-new" options={{ title: 'طلب جديد' }} />
      <Stack.Screen name="customer-new" options={{ title: 'العميل' }} />
      <Stack.Screen name="product-new" options={{ title: 'منتج جديد' }} />
      <Stack.Screen name="product-edit/[id]" options={{ title: 'تعديل المنتج' }} />
      <Stack.Screen name="groups" options={{ title: 'المجموعات والوسوم' }} />
      <Stack.Screen name="reviews" options={{ title: 'التقييمات' }} />
      <Stack.Screen name="settings" options={{ title: 'الإعدادات' }} />
      <Stack.Screen name="today" options={{ title: 'توصيل اليوم' }} />
      <Stack.Screen name="search" options={{ title: 'بحث شامل' }} />
    </Stack>
    </LockGate>
  );
}
