import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

/** Top padding for tab screens: clears the status bar / notch (the floating tab bar has no header). */
export function useTopPad(extra = 10): number {
  const insets = useSafeAreaInsets();
  return Math.max(insets.top, 20) + extra;
}
/** Bottom padding so list content never hides behind the floating glass tab bar. */
export const BOTTOM_PAD = 118;

export function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View style={[{
      borderRadius: 26, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)',
      backgroundColor: 'rgba(30,30,32,0.52)', overflow: 'hidden',
      shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 6 },
    }, style]}>
      <BlurView intensity={55} tint="dark" style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(255,255,255,0.11)', 'rgba(255,255,255,0.02)', 'rgba(255,255,255,0)']} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <View style={{ padding: 16 }}>{children}</View>
    </View>
  );
}

/** Soft brand glow behind tab screens so the glass has something to refract. */
export function GlassGlow() {
  return (
    <LinearGradient
      colors={['rgba(237,41,41,0.22)', 'rgba(237,41,41,0.06)', 'rgba(0,0,0,0)']}
      locations={[0, 0.55, 1]}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 360 }}
      pointerEvents="none"
    />
  );
}

export function StatusPill({ status }: { status?: string }) {
  const { STATUS_LABEL, STATUS_COLOR } = require('../lib/api');
  const color = STATUS_COLOR[status || ''] || '#9CA1A6';
  return (
    <View style={{ backgroundColor: color + '29', borderColor: color + '73', borderWidth: 0.5, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3.5, alignSelf: 'flex-start' }}>
      <Text style={{ color, fontSize: 11.5, fontWeight: '600' }}>{STATUS_LABEL[status || ''] || status || ''}</Text>
    </View>
  );
}

export function Bar({ pct, color }: { pct: number; color: string }) {
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(w, { toValue: Math.min(100, Math.max(0, pct)), duration: 700, useNativeDriver: false }).start();
  }, [pct, w]);
  const width = w.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
  return (
    <View style={{ height: 8, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden', flex: 1 }}>
      <Animated.View style={{ height: '100%', width, backgroundColor: color, borderRadius: 99 }} />
    </View>
  );
}

/** Number that counts up when it appears or changes. */
export function AnimNum({ value, format }: { value: number; format?: (n: number) => string }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const id = anim.addListener(({ value: v }) => setDisplay(Math.round(v)));
    Animated.timing(anim, { toValue: value, duration: 650, useNativeDriver: false }).start();
    return () => { anim.removeListener(id); };
  }, [value, anim]);
  return <>{format ? format(display) : String(display)}</>;
}

/** Fades + slides children in, staggered by index. */
export function FadeIn({ index = 0, children }: { index?: number; children: React.ReactNode }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 380, delay: Math.min(index, 8) * 55, useNativeDriver: true }).start();
  }, [anim, index]);
  return (
    <Animated.View style={{ opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }}>
      {children}
    </Animated.View>
  );
}

export function KV({ k, v, bold }: { k: string; v?: string | null; bold?: boolean }) {
  if (v === null || v === undefined || v === '') return null;
  return (
    <View style={[s.row, { justifyContent: 'space-between' }]}>
      <Text style={s.sub}>{k}</Text>
      <Text style={[s.txt, bold ? { fontWeight: '700' } : null, { flexShrink: 1 }]}>{v}</Text>
    </View>
  );
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const { TextInput } = require('react-native');
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={C.tertiary}
      style={{ backgroundColor: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 11, color: C.label, fontSize: 15, textAlign: 'right' }}
    />
  );
}
