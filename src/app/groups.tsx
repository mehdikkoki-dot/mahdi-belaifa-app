import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text } from 'react-native';
import { api } from '../lib/api';
import { BOTTOM_PAD, C, Card, s } from '../components/ui';

export default function Groups() {
  const [groups, setGroups] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    try {
      const [g, t] = await Promise.all([api.customerGroups(), api.customerTags()]);
      setGroups(Array.isArray(g) ? g : []); setTags(Array.isArray(t) ? t : []);
    } catch { /* ignore */ }
    setLoading(false); setRefreshing(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} size="large" color={C.accent} />;
  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.content, { paddingBottom: BOTTOM_PAD }]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.accent} />}>
      <Text style={s.h2}>مجموعات العملاء</Text>
      {groups.length === 0 ? <Text style={s.sub}>لا توجد مجموعات بعد — أنشئها من لوحة الويب.</Text> : groups.map((g) => (
        <Card key={g.id} style={{ gap: 4 }}>
          <Text style={[s.txt, { fontWeight: '700' }]}>{g.name || 'مجموعة'}</Text>
          {g.description ? <Text style={s.sub}>{g.description}</Text> : null}
          {g.customerCount !== undefined ? <Text style={s.sub}>العملاء: {g.customerCount}</Text> : null}
        </Card>
      ))}
      <Text style={[s.h2, { marginTop: 6 }]}>وسوم العملاء</Text>
      {tags.length === 0 ? <Text style={s.sub}>لا توجد وسوم بعد.</Text> : tags.map((t) => (
        <Card key={t.id} style={{ gap: 4 }}>
          <Text style={[s.txt, { fontWeight: '700' }]}>{t.name || 'وسم'}</Text>
          {t.customerCount !== undefined ? <Text style={s.sub}>العملاء: {t.customerCount}</Text> : null}
        </Card>
      ))}
    </ScrollView>
  );
}
