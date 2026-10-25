import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import { api, fmtDate } from '../lib/api';
import { BOTTOM_PAD, C, Card, EmptyState, s } from '../components/ui';

const stars = (n: number) => '★'.repeat(Math.max(0, Math.min(5, Math.round(n || 0)))) + '☆'.repeat(Math.max(0, 5 - Math.round(n || 0)));

export default function Reviews() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    try { setData(await api.reviews()); } catch { /* ignore */ }
    setLoading(false); setRefreshing(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} size="large" color={C.accent} />;
  const list: any[] = data?.data || data?.reviews || (Array.isArray(data) ? data : []);
  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.content, { paddingBottom: BOTTOM_PAD }]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.accent} />}>
      <Card style={{ gap: 4 }}>
        <Text style={s.h2}>تقييمات العملاء</Text>
        <Text style={s.sub}>المجموع: {data?.total ?? list.length}{data?.pendingCount ? ` · بانتظار الموافقة: ${data.pendingCount}` : ''}</Text>
      </Card>
      {list.length === 0 ? <EmptyState art="search" title="لا توجد تقييمات بعد" sub="تقييمات العملاء على منتجاتك ستظهر هنا." /> : list.map((r) => (
        <Card key={r.id} style={{ gap: 5 }}>
          <View style={[s.row, { justifyContent: 'space-between' }]}>
            <Text style={{ color: '#C7A46A', fontSize: 15 }}>{stars(r.rating)}</Text>
            <Text style={s.sub}>{r.status === 'approved' ? 'معتمد' : r.status === 'pending' ? 'بانتظار الموافقة' : r.status || ''}</Text>
          </View>
          {r.productName ? <Text style={[s.txt, { fontWeight: '600' }]}>{r.productName}</Text> : null}
          {r.comment || r.body ? <Text style={s.txt}>{r.comment || r.body}</Text> : null}
          <Text style={s.sub}>{[r.customerName || r.authorName, r.createdAt ? fmtDate(r.createdAt) : null].filter(Boolean).join(' · ')}</Text>
        </Card>
      ))}
    </ScrollView>
  );
}
