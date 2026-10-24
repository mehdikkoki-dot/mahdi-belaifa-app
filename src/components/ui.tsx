import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export const C = {
  canvas: '#000000',
  card: '#1C1C1E',
  hairline: 'rgba(255,255,255,0.09)',
  label: '#F5F5F7',
  secondary: 'rgba(255,255,255,0.55)',
  tertiary: 'rgba(255,255,255,0.35)',
  accent: '#ED2929',
};

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.canvas },
  content: { padding: 16, gap: 12, paddingBottom: 120 },
  card: { backgroundColor: C.card, borderRadius: 26, padding: 16, borderWidth: 0.5, borderColor: C.hairline },
  h1: { color: C.label, fontSize: 28, fontWeight: '800', textAlign: 'right' },
  h2: { color: C.label, fontSize: 17, fontWeight: '700', textAlign: 'right' },
  txt: { color: C.label, fontSize: 15, textAlign: 'right' },
  sub: { color: C.secondary, fontSize: 13, textAlign: 'right' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  grow: { flex: 1 },
});

export function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function StatusPill({ status }: { status?: string }) {
  const { STATUS_LABEL, STATUS_COLOR } = require('../lib/api');
  const color = STATUS_COLOR[status || ''] || '#9CA1A6';
  return (
    <View style={{ backgroundColor: color + '29', borderColor: color + '73', borderWidth: 0.5, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3.5 }}>
      <Text style={{ color, fontSize: 11.5, fontWeight: '600' }}>{STATUS_LABEL[status || ''] || status || ''}</Text>
    </View>
  );
}
