import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, SectionList, Share, Text, View } from 'react-native';
import { ALL_STATUSES, api, dzd, orderTotalOf, relTime, STATUS_LABEL, waNumber } from '../../lib/api';
import { BOTTOM_PAD, C, Card, FadeIn, GlassButton, GlassGlow, s, SearchBox, StatusPill, useTopPad } from '../../components/ui';
import { loadCache, saveCache } from '../../lib/cache';

const dayKey = (iso?: string) => { const d = new Date(iso || ''); d.setHours(0, 0, 0, 0); return d.getTime(); };
const dayTitle = (t: number) => {
  const today = dayKey(new Date().toISOString());
  if (t === today) return 'اليوم';
  if (t === today - 86400000) return 'أمس';
  return new Date(t).toLocaleDateString('ar-DZ', { weekday: 'long', day: 'numeric', month: 'long' });
};

export default function Orders() {
  const router = useRouter();
  const top = useTopPad();
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const params = useLocalSearchParams<{ filter?: string }>();
  React.useEffect(() => {
    if (params.filter && (params.filter === 'all' || ALL_STATUSES.includes(params.filter))) setFilter(params.filter);
  }, [params.filter]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { const data = await api.orders(); setOrders(data); saveCache('orders', data); }
    catch { const cached = await loadCache('orders'); if (cached) setOrders(cached); }
    setLoading(false); setRefreshing(false);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const shown = useMemo(() => {
    let list = filter === 'all' ? orders : orders.filter((o) => o.status === filter);
    const needle = q.trim().toLowerCase();
    if (needle) list = list.filter((o) => [o.orderNumber, o.customerName, o.phone, o.productName].some((v) => String(v || '').toLowerCase().includes(needle)));
    return list;
  }, [orders, filter, q]);
  const sections = useMemo(() => {
    const map = new Map<number, any[]>();
    shown.forEach((o) => { const k = dayKey(o.createdAt); if (!map.has(k)) map.set(k, []); map.get(k)!.push(o); });
    return [...map.entries()].sort((a, b) => b[0] - a[0]).map(([t, data]) => ({ title: dayTitle(t), data }));
  }, [shown]);
  const present = useMemo(() => ALL_STATUSES.filter((k) => orders.some((o) => o.status === k)), [orders]);

  const confirm = async (o: any) => {
    try { await api.setStatus(o.id, 'confirmed'); setOrders(orders.map((x) => (x.id === o.id ? { ...x, status: 'confirmed' } : x))); }
    catch { Alert.alert('خطأ', 'تعذر تأكيد الطلب'); }
  };
  const exportCsv = () => {
    const rows = [['رقم الطلب', 'التاريخ', 'الزبون', 'الهاتف', 'الولاية', 'الحالة', 'المبلغ'].join(','),
      ...shown.map((o) => [o.orderNumber || '', new Date(o.createdAt).toLocaleDateString('fr-DZ'), (o.customerName || '').replace(/,/g, ' '), o.phone || '', (o.wilaya || '').replace(/,/g, ' '), STATUS_LABEL[o.status] || o.status || '', orderTotalOf(o)].join(','))];
    Share.share({ message: rows.join('\n'), title: 'orders.csv' });
  };

  if (loading) return <View style={[s.screen, { justifyContent: 'center' }]}><ActivityIndicator size="large" color={C.accent} /></View>;
  return (
    <View style={s.screen}>
      <GlassGlow />
      <View style={{ paddingTop: top, paddingHorizontal: 16, gap: 10 }}>
        <View style={[s.row, { justifyContent: 'space-between' }]}>
          <Text style={s.h1}>الطلبات</Text>
          <View style={[s.row, { gap: 8 }]}>
            <GlassButton title="تصدير" small variant="ghost" onPress={exportCsv} />
            <Pressable onPress={() => router.push('/order-new' as any)} style={{ backgroundColor: 'rgba(130,154,137,0.38)', width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(110,134,118,0.55)' }}>
              <Text style={{ color: '#2E4B38', fontSize: 22, fontWeight: '700', lineHeight: 24 }}>+</Text>
            </Pressable>
          </View>
        </View>
        <SearchBox value={q} onChange={setQ} placeholder="ابحث برقم الطلب، الاسم، الهاتف..." />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 10 }}>
        {['all', ...present].map((k) => {
          const isActive = filter === k;
          const n = k === 'all' ? orders.length : orders.filter((o) => o.status === k).length;
          return (
            <Pressable key={k} onPress={() => setFilter(k)} style={{ backgroundColor: isActive ? C.label : 'rgba(255,255,255,0.55)', borderColor: isActive ? C.label : 'rgba(41,45,50,0.12)', borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 }}>
              <Text style={{ color: isActive ? '#F5F4F0' : C.secondary, fontWeight: '600', fontSize: 13 }}>{k === 'all' ? `الكل (${n})` : `${STATUS_LABEL[k]} (${n})`}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <SectionList
        sections={sections}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 12, paddingBottom: BOTTOM_PAD }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.accent} />}
        ListEmptyComponent={<Text style={s.sub}>لا توجد طلبات مطابقة.</Text>}
        renderSectionHeader={({ section }) => <Text style={[s.h2, { fontSize: 15, marginTop: 6 }]}>{section.title}</Text>}
        renderItem={({ item: o, index }) => (
          <FadeIn index={index}>
            <Card>
              <Pressable onPress={() => router.push(`/order/${o.id}` as any)}>
                <View style={s.row}>
                  <View style={s.grow}>
                    <Text style={[s.txt, { fontWeight: '700' }]}>{o.orderNumber || ''}</Text>
                    <Text style={s.sub}>{o.customerName || '—'}{o.phone ? ` · ${o.phone}` : ''}</Text>
                    {o.productName ? <Text style={s.sub}>{o.productName} × {o.quantity ?? 1}</Text> : null}
                  </View>
                  <StatusPill status={o.status} />
                </View>
                <View style={[s.row, { justifyContent: 'space-between', marginTop: 8 }]}>
                  <Text style={[s.txt, { fontWeight: '700' }]}>{dzd(orderTotalOf(o))}</Text>
                  <Text style={s.sub}>{relTime(o.createdAt)}</Text>
                </View>
              </Pressable>
              <View style={[s.row, { marginTop: 10, gap: 8 }]}>
                <GlassButton title="اتصال" small variant="green" flex onPress={() => o.phone && Linking.openURL(`tel:${o.phone}`)} />
                <GlassButton title="واتساب" small variant="green" flex onPress={() => o.phone && Linking.openURL(`https://wa.me/${waNumber(o.phone)}`)} />
                {o.status === 'new' ? <GlassButton title="تأكيد" small variant="primary" flex onPress={() => confirm(o)} /> : null}
              </View>
            </Card>
          </FadeIn>
        )}
      />
    </View>
  );
}
