import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { api, dzd, orderTotalOf } from '../lib/api';
import { BOTTOM_PAD, Card, s, SearchBox, StatusPill } from '../components/ui';

export default function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    api.orders().then(setOrders).catch(() => {});
    api.customers().then(setCustomers).catch(() => {});
    api.products().then(setProducts).catch(() => {});
  }, []);

  const needle = q.trim().toLowerCase();
  const match = (vals: any[]) => needle.length > 0 && vals.some((v) => String(v || '').toLowerCase().includes(needle));
  const oRes = useMemo(() => (needle ? orders.filter((o) => match([o.orderNumber, o.customerName, o.phone, o.productName])) : []), [orders, needle]);
  const cRes = useMemo(() => (needle ? customers.filter((c) => match([c.name, c.phone, c.phone2])) : []), [customers, needle]);
  const pRes = useMemo(() => (needle ? products.filter((p) => match([p.name, p.sku])) : []), [products, needle]);

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.content, { paddingBottom: BOTTOM_PAD }]} keyboardShouldPersistTaps="handled">
      <SearchBox value={q} onChange={setQ} placeholder="ابحث في الطلبات والعملاء والمنتجات..." />
      {!needle ? <Text style={s.sub}>اكتب رقم طلب، اسم، هاتف، أو منتج.</Text> : null}
      {needle && oRes.length + cRes.length + pRes.length === 0 ? <Text style={s.sub}>لا نتائج لـ «{q}».</Text> : null}

      {oRes.length > 0 ? <Text style={s.h2}>الطلبات ({oRes.length})</Text> : null}
      {oRes.slice(0, 10).map((o) => (
        <Pressable key={o.id} onPress={() => router.push(`/order/${o.id}` as any)}>
          <Card>
            <View style={s.row}>
              <View style={s.grow}>
                <Text style={[s.txt, { fontWeight: '700' }]}>{o.orderNumber || ''}</Text>
                <Text style={s.sub}>{o.customerName || '—'}{o.phone ? ` · ${o.phone}` : ''}</Text>
              </View>
              <StatusPill status={o.status} />
            </View>
            <Text style={[s.txt, { fontWeight: '700', marginTop: 6 }]}>{dzd(orderTotalOf(o))}</Text>
          </Card>
        </Pressable>
      ))}

      {cRes.length > 0 ? <Text style={s.h2}>العملاء ({cRes.length})</Text> : null}
      {cRes.slice(0, 10).map((c) => (
        <Pressable key={c.id} onPress={() => router.push(`/customer/${c.id}` as any)}>
          <Card>
            <Text style={[s.txt, { fontWeight: '700' }]}>{c.name}</Text>
            <Text style={s.sub}>{[c.phone, c.wilaya].filter(Boolean).join(' · ')}</Text>
          </Card>
        </Pressable>
      ))}

      {pRes.length > 0 ? <Text style={s.h2}>المنتجات ({pRes.length})</Text> : null}
      {pRes.slice(0, 10).map((p) => (
        <Pressable key={p.id} onPress={() => router.push(`/product/${p.id}` as any)}>
          <Card>
            <Text style={[s.txt, { fontWeight: '700' }]}>{p.name}</Text>
            <Text style={s.sub}>{dzd(p.price)}</Text>
          </Card>
        </Pressable>
      ))}
    </ScrollView>
  );
}
