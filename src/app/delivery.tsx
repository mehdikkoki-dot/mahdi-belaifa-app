import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { api } from '../lib/api';
import { BOTTOM_PAD, C, Card, KV, s } from '../components/ui';

export default function Delivery() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const [p, c, d] = await Promise.all([api.shippingProfiles(), api.companies(), api.drivers()]);
        setProfiles(p); setCompanies(c); setDrivers(d);
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);
  if (loading) return <View style={[s.screen, { justifyContent: 'center' }]}><ActivityIndicator size="large" color={C.accent} /></View>;
  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.content, { paddingBottom: BOTTOM_PAD }]}>
      <Text style={s.h1}>الشحن والتوصيل</Text>
      <Text style={s.h2}>ملفات الشحن</Text>
      {profiles.map((p: any) => (
        <Card key={p.id} style={{ gap: 8 }}>
          <Text style={[s.txt, { fontWeight: '700' }]}>{p.name}{p.isDefault ? ' · الافتراضي' : ''}</Text>
          <KV k="قواعد الولايات" v={p.ruleCount !== null && p.ruleCount !== undefined ? String(p.ruleCount) : null} />
          <KV k="ملاحظات" v={p.notes} />
        </Card>
      ))}
      {profiles.length === 0 ? <Text style={s.sub}>لا توجد ملفات شحن.</Text> : null}
      <Text style={s.h2}>شركات التوصيل</Text>
      {companies.map((c: any) => (
        <Card key={c.id} style={{ gap: 8 }}>
          <Text style={[s.txt, { fontWeight: '700' }]}>{c.name || 'شركة'}</Text>
          <KV k="الهاتف" v={c.phone} />
          <KV k="الحالة" v={c.isActive === false ? 'غير مفعّلة' : 'مفعّلة'} />
        </Card>
      ))}
      {companies.length === 0 ? <Text style={s.sub}>لا توجد شركات توصيل مضافة.</Text> : null}
      <Text style={s.h2}>السائقون</Text>
      {drivers.map((d: any) => (
        <Card key={d.id} style={{ gap: 8 }}>
          <Text style={[s.txt, { fontWeight: '700' }]}>{d.name || 'سائق'}</Text>
          <KV k="الهاتف" v={d.phone} />
          <KV k="الحالة" v={d.isActive === false ? 'غير مفعّل' : 'مفعّل'} />
        </Card>
      ))}
      {drivers.length === 0 ? <Text style={s.sub}>لا يوجد سائقون مضافون.</Text> : null}
    </ScrollView>
  );
}
