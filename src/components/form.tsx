import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, GlassButton, s, SearchBox } from './ui';

export function Field({ label, value, onChange, placeholder, keyboard, multiline }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  keyboard?: 'default' | 'phone-pad' | 'numeric'; multiline?: boolean;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[s.sub, { color: C.label, fontWeight: '600' }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={C.tertiary}
        keyboardType={keyboard || 'default'}
        multiline={multiline}
        style={{ backgroundColor: 'rgba(255,255,255,0.65)', borderColor: 'rgba(41,45,50,0.12)', borderWidth: 1, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 11, color: C.label, fontSize: 15, textAlign: 'right', minHeight: multiline ? 70 : undefined }}
      />
    </View>
  );
}

export interface PickItem { id: string; label: string; sub?: string }

export function PickerField({ label, valueLabel, placeholder, items, onPick }: {
  label: string; valueLabel?: string; placeholder: string; items: PickItem[]; onPick: (item: PickItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const insets = useSafeAreaInsets();
  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return items;
    return items.filter((i) => i.label.toLowerCase().includes(n) || (i.sub || '').toLowerCase().includes(n));
  }, [items, q]);
  return (
    <View style={{ gap: 6 }}>
      <Text style={[s.sub, { color: C.label, fontWeight: '600' }]}>{label}</Text>
      <Pressable onPress={() => setOpen(true)} style={{ backgroundColor: 'rgba(255,255,255,0.65)', borderColor: 'rgba(41,45,50,0.12)', borderWidth: 1, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 12 }}>
        <Text style={{ color: valueLabel ? C.label : C.tertiary, fontSize: 15, textAlign: 'right' }}>{valueLabel || placeholder}</Text>
      </Pressable>
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: C.canvas, paddingTop: insets.top + 10, paddingHorizontal: 16, paddingBottom: insets.bottom + 12 }}>
          <View style={[s.row, { justifyContent: 'space-between', marginBottom: 10 }]}>
            <Text style={s.h2}>{label}</Text>
            <Pressable onPress={() => setOpen(false)} style={{ backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: 'rgba(41,45,50,0.12)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 }}>
              <Text style={{ color: C.label, fontWeight: '600' }}>إغلاق</Text>
            </Pressable>
          </View>
          <SearchBox value={q} onChange={setQ} placeholder="ابحث..." />
          <FlatList
            style={{ marginTop: 10 }}
            data={shown}
            keyExtractor={(i) => i.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable onPress={() => { onPick(item); setOpen(false); setQ(''); }} style={{ paddingVertical: 13, borderBottomWidth: 0.5, borderBottomColor: C.hairline }}>
                <Text style={[s.txt, { fontWeight: '600' }]}>{item.label}</Text>
                {item.sub ? <Text style={s.sub}>{item.sub}</Text> : null}
              </Pressable>
            )}
            ListEmptyComponent={<Text style={[s.sub, { marginTop: 16 }]}>لا نتائج.</Text>}
          />
        </View>
      </Modal>
    </View>
  );
}

export function ChipRow({ options, value, onChange }: {
  options: { value: string; label: string }[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={{ backgroundColor: active ? C.label : 'rgba(255,255,255,0.55)', borderColor: active ? C.label : 'rgba(41,45,50,0.14)', borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 }}>
            <Text style={{ color: active ? '#F5F3EE' : C.secondary, fontWeight: '600', fontSize: 13.5 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function QtyStepper({ qty, setQty }: { qty: number; setQty: (n: number) => void }) {
  const Btn = ({ t, fn }: { t: string; fn: () => void }) => (
    <Pressable onPress={fn} style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: 'rgba(41,45,50,0.14)', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: C.label, fontSize: 19, fontWeight: '700' }}>{t}</Text>
    </Pressable>
  );
  return (
    <View style={[s.row, { gap: 12 }]}>
      <Btn t="+" fn={() => setQty(Math.min(999, qty + 1))} />
      <Text style={[s.txt, { fontWeight: '700', fontSize: 17, minWidth: 30, textAlign: 'center' }]}>{qty}</Text>
      <Btn t="−" fn={() => setQty(Math.max(1, qty - 1))} />
    </View>
  );
}

export function SaveButton({ title, busy, onPress, disabled }: { title: string; busy?: boolean; onPress: () => void; disabled?: boolean }) {
  return <GlassButton title={busy ? 'جارٍ الحفظ...' : title} onPress={onPress} variant="primary" disabled={busy || disabled} />;
}
