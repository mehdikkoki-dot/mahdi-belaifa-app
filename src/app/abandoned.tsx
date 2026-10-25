import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { api, dzd, fmtDate } from '../lib/api';
import { BOTTOM_PAD, C, Card, s } from '../components/ui';

export default function Abandoned() {
  const [stats, setStats] = useState<any>(null);
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try { const [st, li] = await Promise.all([api.abandonedStats(), api.abandoned()]); setStats(st); setList(Array.isArray(li) ? li : []); } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);
  if (loading) return <View style={[s.screen, { justifyContent: 'center' }]}><ActivityIndicator size="large" color={C.accent} /></View>;
  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.content, { paddingBottom: BOTTOM_PAD }]}>
      <Text style={s.h1}>الطلبات المهجورة</Text>
      <View style={s.row}>
        <Card style={{ flex: 1 }}>
          <Text style={[s.h2, { fontSize: 22 }]}>{stats?.totalAbandoned ?? 0}</Text>
          <Text style={s.sub}>طلبات مهجورة</Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text style={[s.h2, { fontSize: 22 }]}>{stats?.totalConverted ?? 0}</Text>
          <Text style={s.sub}>تحوّلت لطلبات</Text>
        </Card>
      </View>
      <View style={s.row}>
        <Card style={{ flex: 1 }}>
          <Text style={[s.h2, { fontSize: 22 }]}>{stats?.conversionRate ?? 0}%</Text>
          <Text style={s.sub}>نسبة التحويل</Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text style={[s.h2, { fontSize: 22 }]}>{dzd(stats?.estimatedLostRevenue)}</Text>
          <Text style={s.sub}>مداخيل ضائعة تقديرية</Text>
        </Card>
      </View>
      {list.map((a: any) => (
        <Card key={a.id}>
          <View style={s.row}>
            <View style={s.grow}>
              <Text style={[s.txt, { fontWeight: '700' }]}>{a.customerName || a.name || 'زائر'}</Text>
              <Text style={s.sub}>{[a.phone, a.productName, fmtDate(a.createdAt)].filter(Boolean).join(' · ')}</Text>
            </View>
            <Text style={[s.txt, { fontWeight: '700' }]}>{dzd(a.price ?? a.codAmount)}</Text>
          </View>
        </Card>
      ))}
      {list.length === 0 ? <Text style={s.sub}>لا توجد طلبات مهجورة مسجلة.</Text> : null}
    </ScrollView>
  );
}
