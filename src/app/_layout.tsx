import { Stack } from 'expo-router';
import { I18nManager } from 'react-native';

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

export default function RootLayout() {
  return (
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
    </Stack>
  );
}
