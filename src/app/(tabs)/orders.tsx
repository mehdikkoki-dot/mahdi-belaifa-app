import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Image, ImageBackground, Modal, Pressable, RefreshControl, ScrollView, SectionList, Share, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { SymbolView } from 'expo-symbols';
import { ALL_STATUSES, api, dzd, orderTotalOf, relTime, STATUS_LABEL, waNumber } from '../../lib/api';
import { BOTTOM_PAD, C, Card, EmptyState, FadeIn, HERO_LIGHT, s, SearchBox, Skeleton, SoftIcon, StatusPill, useTopPad } from '../../components/ui';
import { loadCache, saveCache } from '../../lib/cache';
import { tapLight } from '../../lib/haptics';

const dayKey = (iso?: string) => { const d = new Date(iso || ''); d.setHours(0, 0, 0, 0); return d.getTime(); };
const dayTitle = (t: number) => {
  const today = dayKey(new Date().toISOString());
  if (t === today) return 'اليوم';
  if (t === today - 86400000) return 'أمس';
  return new Date(t).toLocaleDateString('ar-DZ', { weekday: 'long', day: 'numeric', month: 'long' });
};
type Range = 'all' | 'today' | 'yesterday' | 'week';

export default function Orders() {
  const router = useRouter();
  const top = useTopPad();
  const [orders, setOrders] = useState<any[]>([]);
  const [imgMap, setImgMap] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<string>('all');
  const [range, setRange] = useState<Range>('all');
  const [sortAsc, setSortAsc] = useState(false);
  const [sheet, setSheet] = useState(false);
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
    api.products().then((ps: any[]) => {
      const m: Record<string, string> = {};
      (ps || []).forEach((p) => { const u = p.images?.[0]?.url || p.imageUrl; if (p.name && u) m[p.name] = u; });
      setImgMap(m);
    }).catch(() => {});
    setLoading(false); setRefreshing(false);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const inRange = useCallback((o: any) => {
    const t = dayKey(o.createdAt); const today = dayKey(new Date().toISOString());
    if (range === 'today') return t === today;
    if (range === 'yesterday') return t === today - 86400000;
    if (range === 'week') return t >= today - 6 * 86400000;
    return true;
  }, [range]);

  const shown = useMemo(() => {
    let list = orders.filter(inRange);
    if (filter !== 'all') list = list.filter((o) => o.status === filter);
    const needle = q.trim().toLowerCase();
    if (needle) list = list.filter((o) => [o.orderNumber, o.customerName, o.phone, o.productName].some((v) => String(v || '').toLowerCase().includes(needle)));
    return list;
  }, [orders, filter, q, inRange]);
  const sections = useMemo(() => {
    const map = new Map<number, any[]>();
    shown.forEach((o) => { const k = dayKey(o.createdAt); if (!map.has(k)) map.set(k, []); map.get(k)!.push(o); });
    return [...map.entries()].sort((a, b) => (sortAsc ? a[0] - b[0] : b[0] - a[0]))
      .map(([t, data]) => ({ title: dayTitle(t), count: data.length, data: data.sort((x, y) => sortAsc ? new Date(x.createdAt).getTime() - new Date(y.createdAt).getTime() : new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime()) }));
  }, [shown, sortAsc]);
  const present = useMemo(() => ALL_STATUSES.filter((k) => orders.some((o) => o.status === k)), [orders]);
  const nNew = orders.filter((o) => o.status === 'new').length;
  const nTransit = orders.filter((o) => ['assigned', 'dispatched', 'out_for_delivery'].includes(o.status)).length;
  const nDelivered = orders.filter((o) => o.status === 'delivered').length;

  const confirm = async (o: any) => {
    try { await api.setStatus(o.id, 'confirmed'); setOrders(orders.map((x) => (x.id === o.id ? { ...x, status: 'confirmed' } : x))); }
    catch { Alert.alert('خطأ', 'تعذر تأكيد الطلب'); }
  };
  const exportCsv = () => {
    const rows = [['رقم الطلب', 'التاريخ', 'الزبون', 'الهاتف', 'الولاية', 'الحالة', 'المبلغ'].join(','),
      ...shown.map((o) => [o.orderNumber || '', new Date(o.createdAt).toLocaleDateString('fr-DZ'), (o.customerName || '').replace(/,/g, ' '), o.phone || '', (o.wilaya || '').replace(/,/g, ' '), STATUS_LABEL[o.status] || o.status || '', orderTotalOf(o)].join(','))];
    Share.share({ message: rows.join('\n'), title: 'orders.csv' });
  };
  const RoundBtn = ({ glyph, onPress, filled }: { glyph: string; onPress: () => void; filled?: boolean }) => (
    <Pressable onPress={() => { tapLight(); onPress(); }}>
      <View style={{ width: 40, height: 40, borderRadius: 999, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.7)' }}>
        <BlurView intensity={60} tint="light" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: filled ? 'rgba(130,152,137,0.85)' : 'rgba(255,255,255,0.5)' }} />
        <SymbolView name={glyph as any} size={17} tintColor={filled ? '#FFFFFF' : '#292D30'} />
      </View>
    </Pressable>
  );
  const StatCard = ({ tint, icon, color, label, n, onPress }: any) => (
    <Pressable onPress={onPress} style={{ flex: 1 }}>
      <View style={{ backgroundColor: tint, borderRadius: 20, padding: 12, gap: 6 }}>
        <SoftIcon name={icon} tint="rgba(255,255,255,0.55)" color={color} size={30} radius={10} glyph={14} />
        <Text style={{ color: C.secondary, fontSize: 11.5, fontWeight: '600', textAlign: 'right' }}>{label}</Text>
        <Text style={[s.txt, { fontSize: 20, fontWeight: '800' }]}>{n}</Text>
      </View>
    </Pressable>
  );

  if (loading) return (
    <View style={[s.screen, { paddingTop: top, paddingHorizontal: 16, gap: 12 }]}>
      <Skeleton height={120} radius={24} />
      <Skeleton height={46} radius={999} />
      {[0, 1, 2].map((i) => <Skeleton key={i} height={92} radius={20} />)}
    </View>
  );
  return (
    <View style={s.screen}>
      <ImageBackground source={HERO_LIGHT} resizeMode="cover" style={{ paddingTop: top, paddingHorizontal: 16, paddingBottom: 14 }}>
        <FadeIn index={0}>
          <View style={[s.row, { justifyContent: 'space-between' }]}>
            <RoundBtn glyph="line.3.horizontal.decrease" onPress={() => setSheet(true)} />
            <View style={{ alignItems: 'center', gap: 1 }}>
              <Text style={{ color: '#292D30', fontSize: 23, fontWeight: '800', textAlign: 'center' }}>الطلبات</Text>
              <Text style={{ color: '#5A5E58', fontSize: 12, textAlign: 'center' }}>إدارة جميع طلباتك بسهولة</Text>
            </View>
            <RoundBtn glyph="plus" filled onPress={() => router.push('/order-new' as any)} />
          </View>
        </FadeIn>
        <View style={{ marginTop: 12 }}>
          <SearchBox value={q} onChange={setQ} placeholder="ابحث برقم الطلب، الزبون..." />
        </View>
      </ImageBackground>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 10 }}>
        {['all', ...present].map((k) => {
          const isActive = filter === k;
          return (
            <Pressable key={k} onPress={() => { tapLight(); setFilter(k); }} style={{ backgroundColor: isActive ? '#5F7A68' : '#FFFFFF', borderColor: 'rgba(41,45,48,0.07)', borderWidth: 0.5, borderRadius: 999, paddingHorizontal: 15, paddingVertical: 7.5, shadowColor: '#3A4038', shadowOpacity: isActive ? 0.16 : 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } }}>
              <Text style={{ color: isActive ? '#FFFFFF' : C.secondary, fontWeight: '600', fontSize: 13 }}>{k === 'all' ? 'الكل' : STATUS_LABEL[k]}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingBottom: 4 }}>
        <StatCard tint="rgba(190,141,141,0.15)" icon="bell.fill" color="#A96F6F" label="جديد" n={nNew} onPress={() => setFilter('new')} />
        <StatCard tint="rgba(195,161,106,0.16)" icon="truck.box.fill" color="#A5814C" label="قيد التوصيل" n={nTransit} onPress={() => setFilter('out_for_delivery')} />
        <StatCard tint="rgba(130,152,137,0.16)" icon="checkmark" color="#5F7A68" label="تم التسليم" n={nDelivered} onPress={() => setFilter('delivered')} />
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ padding: 16, paddingTop: 6, gap: 10, paddingBottom: BOTTOM_PAD + 56 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.accent} />}
        ListEmptyComponent={orders.length === 0 ? <EmptyState art="orders" title="لا توجد طلبات بعد" sub="ستظهر طلبات متجرك هنا فور وصولها." /> : <EmptyState art="search" title="لا نتائج مطابقة" sub="جرّب كلمة بحث أو مرشّحاً آخر." />}
        renderSectionHeader={({ section }) => (
          <View style={[s.row, { marginTop: 8, gap: 10 }]}>
            <Text style={[s.h2, { fontSize: 15 }]}>{section.title}</Text>
            <View style={{ flex: 1, height: 0.5, backgroundColor: C.hairline }} />
            <Text style={{ color: C.secondary, fontSize: 11.5 }}>{section.count} {section.count === 1 ? 'طلب' : 'طلبات'}</Text>
          </View>
        )}
        renderItem={({ item: o, index }) => (
          <FadeIn index={Math.min(index, 5)}>
            <Card style={{ padding: 12 }}>
              <Pressable onPress={() => router.push(`/order/${o.id}` as any)}>
                <View style={s.row}>
                  {imgMap[o.productName] ? <Image source={{ uri: imgMap[o.productName] }} style={{ width: 52, height: 52, borderRadius: 14 }} /> : <SoftIcon name="shippingbox.fill" tint="#EFEDE7" color="#8A8F87" size={52} radius={14} glyph={20} />}
                  <View style={{ flex: 1, gap: 2.5 }}>
                    <StatusPill status={o.status} />
                    <Text style={[s.txt, { fontWeight: '700', fontSize: 13.5 }]}>{o.orderNumber || ''}</Text>
                    <Text style={[s.sub, { fontSize: 12.5 }]}>{o.customerName || '—'}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={[s.sub, { fontSize: 11.5 }]}>{relTime(o.createdAt)}</Text>
                      <Text style={[s.txt, { fontWeight: '800', fontSize: 14.5 }]}>{dzd(orderTotalOf(o))}</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'center', gap: 10 }}>
                    <Text style={{ color: C.tertiary, fontSize: 16 }}>{'‹'}</Text>
                    <View style={{ flexDirection: 'row', gap: 7 }}>
                      <Pressable onPress={() => o.phone && Linking.openURL(`tel:${o.phone}`)} hitSlop={4}>
                        <View style={{ width: 34, height: 34, borderRadius: 999, backgroundColor: 'rgba(130,152,137,0.16)', alignItems: 'center', justifyContent: 'center' }}>
                          <SymbolView name="phone.fill" size={14} tintColor="#5F7A68" />
                        </View>
                      </Pressable>
                      <Pressable onPress={() => o.phone && Linking.openURL(`https://wa.me/${waNumber(o.phone)}`)} hitSlop={4}>
                        <View style={{ width: 34, height: 34, borderRadius: 999, backgroundColor: 'rgba(127,169,140,0.18)', alignItems: 'center', justifyContent: 'center' }}>
                          <SymbolView name="message.fill" size={14} tintColor="#4E7A5A" />
                        </View>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </Pressable>
              {o.status === 'new' ? (
                <Pressable onPress={() => confirm(o)} style={{ marginTop: 10, paddingTop: 9, borderTopWidth: 0.5, borderTopColor: C.hairline }}>
                  <Text style={{ color: '#5F7A68', fontWeight: '700', fontSize: 13, textAlign: 'center' }}>تأكيد الطلب</Text>
                </Pressable>
              ) : null}
            </Card>
          </FadeIn>
        )}
      />

      <View style={{ position: 'absolute', bottom: BOTTOM_PAD - 14, alignSelf: 'center', borderRadius: 999, overflow: 'hidden', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.65)', shadowColor: '#3A4038', shadowOpacity: 0.14, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } }}>
        <BlurView intensity={55} tint="light" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
        <View style={{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.5)', padding: 4, gap: 2 }}>
          {([['all', 'الكل'], ['today', 'اليوم'], ['yesterday', 'أمس'], ['week', 'الأسبوع']] as [Range, string][]).map(([k, label]) => (
            <Pressable key={k} onPress={() => { tapLight(); setRange(k); }} style={{ backgroundColor: range === k ? '#5F7A68' : 'transparent', borderRadius: 999, paddingHorizontal: 13, paddingVertical: 6.5 }}>
              <Text style={{ color: range === k ? '#FFFFFF' : C.secondary, fontWeight: '600', fontSize: 12.5 }}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Modal visible={sheet} transparent animationType="slide" onRequestClose={() => setSheet(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(41,45,48,0.35)' }} onPress={() => setSheet(false)}>
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FBFAF7', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 34, gap: 2 }}>
            <Text style={[s.h2, { marginBottom: 8 }]}>خيارات الطلبات</Text>
            <Pressable onPress={() => { setSortAsc(false); setSheet(false); }}>
              <View style={[s.row, { paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: C.hairline }]}>
                <Text style={[s.txt, { flex: 1, fontWeight: '500' }]}>الأحدث أولاً</Text>
                {!sortAsc ? <SymbolView name="checkmark" size={15} tintColor="#5F7A68" /> : null}
              </View>
            </Pressable>
            <Pressable onPress={() => { setSortAsc(true); setSheet(false); }}>
              <View style={[s.row, { paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: C.hairline }]}>
                <Text style={[s.txt, { flex: 1, fontWeight: '500' }]}>الأقدم أولاً</Text>
                {sortAsc ? <SymbolView name="checkmark" size={15} tintColor="#5F7A68" /> : null}
              </View>
            </Pressable>
            <Pressable onPress={() => { setSheet(false); exportCsv(); }}>
              <View style={[s.row, { paddingVertical: 12 }]}>
                <Text style={[s.txt, { flex: 1, fontWeight: '500' }]}>تصدير القائمة (CSV)</Text>
                <SymbolView name="square.and.arrow.up" size={15} tintColor="#5F7488" />
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
