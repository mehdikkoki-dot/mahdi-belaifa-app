import { NativeTabs } from 'expo-router/native-tabs';

export default function TabsLayout() {
  return (
    <NativeTabs backgroundColor="#F5F3EE" tintColor="#6E8A77">
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>اليوم</NativeTabs.Trigger.Label>
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
      <NativeTabs.Trigger name="profit">
        <NativeTabs.Trigger.Label>الأرباح</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chart.line.uptrend.xyaxis" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="more">
        <NativeTabs.Trigger.Label>المزيد</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="ellipsis.circle" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
