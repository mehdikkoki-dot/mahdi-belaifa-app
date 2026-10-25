import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { SymbolView } from 'expo-symbols';
import Svg, { Polygon, Polyline } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const C = {
  canvas: '#F5F3EE',
  card: '#FFFFFF',
  hairline: 'rgba(41,45,50,0.10)',
  label: '#292D30',
  secondary: '#858982',
  tertiary: 'rgba(41,45,50,0.38)',
  accent: '#829889',
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
      backgroundColor: '#FFFFFF', borderRadius: 22, padding: 16,
      borderWidth: 0.5, borderColor: 'rgba(41,45,48,0.06)',
      shadowColor: '#3A4038', shadowOpacity: 0.07, shadowRadius: 14, shadowOffset: { width: 0, height: 5 },
    }, style]}>
      {children}
    </View>
  );
}

export type GlassVariant = 'primary' | 'neutral' | 'green' | 'ghost';
const GLASS_COLORS: Record<GlassVariant, { bg: string; border: string; text: string; glow?: string }> = {
  primary: { bg: 'rgba(130,154,137,0.38)', border: 'rgba(110,134,118,0.55)', text: '#2E4B38', glow: '#829889' },
  neutral: { bg: 'rgba(255,255,255,0.55)', border: 'rgba(41,45,50,0.14)', text: '#292D32' },
  green: { bg: 'rgba(139,170,150,0.35)', border: 'rgba(120,155,135,0.55)', text: '#2E4B38', glow: '#8BAA96' },
  ghost: { bg: 'rgba(255,255,255,0.35)', border: 'rgba(41,45,50,0.10)', text: '#5A5E58' },
};

/** iOS 26-style Liquid Glass pill button: frosted blur, bright rim, specular top light. */
export function GlassButton({ title, onPress, variant = 'neutral', small, flex, disabled }: {
  title: string; onPress?: () => void; variant?: GlassVariant; small?: boolean; flex?: boolean; disabled?: boolean;
}) {
  const c = GLASS_COLORS[variant];
  const { tapLight } = require('../lib/haptics');
  return (
    <Pressable
      onPress={() => { tapLight(); onPress?.(); }}
      disabled={disabled}
      style={({ pressed }) => ({
        flex: flex ? 1 : undefined,
        borderRadius: 999, overflow: 'hidden',
        borderWidth: 1, borderColor: c.border, backgroundColor: c.bg,
        opacity: disabled ? 0.5 : 1,
        transform: [{ scale: pressed && !disabled ? 0.965 : 1 }],
        shadowColor: c.glow || '#000', shadowOpacity: c.glow ? 0.45 : 0.25, shadowRadius: c.glow ? 14 : 8, shadowOffset: { width: 0, height: 5 },
      })}>
      <BlurView intensity={45} tint="light" style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(255,255,255,0.50)', 'rgba(255,255,255,0.10)', 'rgba(255,255,255,0)']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <Text style={{ color: c.text, fontWeight: '700', fontSize: small ? 13 : 15, textAlign: 'center', paddingVertical: small ? 8 : 13, paddingHorizontal: small ? 14 : 20 }}>{title}</Text>
    </Pressable>
  );
}

export const HERO_LIGHT = require('../../assets/images/hero-light.jpg');
export const HERO_DARK = require('../../assets/images/hero-dark.jpg');

/** Soft tinted icon in a rounded chip or circle (SF Symbols). */
export function SoftIcon({ name, tint = 'rgba(130,152,137,0.15)', color = '#5F7A68', size = 38, radius = 12, glyph = 17, circle = false }: {
  name: string; tint?: string; color?: string; size?: number; radius?: number; glyph?: number; circle?: boolean;
}) {
  return (
    <View style={{ width: size, height: size, borderRadius: circle ? 999 : radius, backgroundColor: tint, alignItems: 'center', justifyContent: 'center' }}>
      <SymbolView name={name as any} size={glyph} tintColor={color} />
    </View>
  );
}

/** Minimal sparkline for the hero finance card. */
export function Sparkline({ data, width = 118, height = 38, color = '#FFFFFF' }: { data: number[]; width?: number; height?: number; color?: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - 3 - ((v - min) / (max - min || 1)) * (height - 9)}`).join(' ');
  return (
    <Svg width={width} height={height}>
      <Polygon points={`0,${height} ${pts} ${width},${height}`} fill={color} opacity={0.16} />
      <Polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  );
}

/** Animated bar that grows to its height when it appears. */
export function GrowBar({ height, color, radius = 6 }: { height: number; color: string; radius?: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: Math.max(4, height), duration: 750, useNativeDriver: false }).start();
  }, [height, anim]);
  return <Animated.View style={{ width: '70%', alignSelf: 'center', height: anim, borderRadius: radius, backgroundColor: color }} />;
}

/** Pulsing skeleton block for loading states. */
export function Skeleton({ height = 16, width = '100%', radius = 8, style }: { height?: number; width?: any; radius?: number; style?: any }) {
  const anim = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: false }),
      Animated.timing(anim, { toValue: 0.45, duration: 700, useNativeDriver: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [anim]);
  return <Animated.View style={[{ height, width, borderRadius: radius, backgroundColor: '#E3E1D8', opacity: anim }, style]} />;
}

export const EMPTY_ART = {
  orders: require('../../assets/images/empty-orders.jpg'),
  products: require('../../assets/images/empty-products.jpg'),
  delivery: require('../../assets/images/empty-delivery.jpg'),
  search: require('../../assets/images/empty-search.jpg'),
};

/** Illustrated empty state with a gentle entrance. */
export function EmptyState({ art, title, sub }: { art: keyof typeof EMPTY_ART; title: string; sub?: string }) {
  return (
    <FadeIn index={1}>
      <View style={{ alignItems: 'center', gap: 10, paddingVertical: 26, paddingHorizontal: 12 }}>
        <Image source={EMPTY_ART[art]} style={{ width: 210, height: 158, borderRadius: 20 }} resizeMode="cover" />
        <Text style={[s.h2, { fontSize: 16, textAlign: 'center' }]}>{title}</Text>
        {sub ? <Text style={[s.sub, { textAlign: 'center' }]}>{sub}</Text> : null}
      </View>
    </FadeIn>
  );
}

/** Soft brand glow behind tab screens so the glass has something to refract. */
export function GlassGlow() {
  return (
    <LinearGradient
      colors={['rgba(130,154,137,0.13)', 'rgba(130,154,137,0.04)', 'rgba(245,244,240,0)']}
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
    <View style={{ height: 8, borderRadius: 99, backgroundColor: 'rgba(41,45,50,0.08)', overflow: 'hidden', flex: 1 }}>
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
      style={{ backgroundColor: '#FFFFFF', borderColor: 'rgba(41,45,48,0.06)', borderWidth: 0.5, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 12, color: C.label, fontSize: 15, textAlign: 'right', shadowColor: '#3A4038', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }}
    />
  );
}
