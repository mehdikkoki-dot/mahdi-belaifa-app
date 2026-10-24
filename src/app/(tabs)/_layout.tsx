import { NativeTabs } from 'expo-router/native-tabs';

export default function TabsLayout() {
  return (
    <NativeTabs backgroundColor="#000000" tintColor="#ED2929">
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>الرئيسية</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="square.grid.2x2" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="orders">
        <NativeTabs.Trigger.Label>الطلبات</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="bag" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="products">
        <NativeTabs.Trigger.Label>المنتجات</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="shippingbox" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="customers">
        <NativeTabs.Trigger.Label>العملاء</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.2" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="more">
        <NativeTabs.Trigger.Label>المزيد</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="ellipsis.circle" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
