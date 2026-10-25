import { API_BASE, API_KEY } from './config';

async function req(path: string, method = 'GET', body?: unknown) {
  const r = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { 'X-API-Key': API_KEY, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j?.success) throw new Error(j?.error || `HTTP ${r.status}`);
  return j.data;
}

export const api = {
  stats: () => req('/api/analytics/dashboard-stats'),
  orders: (): Promise<any[]> => req('/api/orders?limit=100&offset=0'),
  order: (id: string) => req(`/api/orders/${id}`),
  setStatus: (id: string, status: string) => req(`/api/orders/${id}/status`, 'PATCH', { status }),
  products: (): Promise<any[]> => req('/api/products?limit=100&offset=0'),
  customers: (): Promise<any[]> => req('/api/customers?limit=100&offset=0'),
  customerOrders: (id: string): Promise<any[]> => req(`/api/customers/${id}/orders`),
  store: () => req('/api/stores/me'),
  wilayas: (): Promise<any[]> => req('/api/wilayas'),
  communes: (w: number): Promise<any[]> => req(`/api/wilayas/${w}/communes`),
  shippingRules: (): Promise<any[]> => req('/api/shipping-profiles/default/rules'),
  createOrder: (body: any) => req('/api/orders', 'POST', body),
  customerGroups: (): Promise<any[]> => req('/api/customer-groups'),
  customerTags: (): Promise<any[]> => req('/api/customer-tags'),
  reviews: () => req('/api/reviews'),
  pixelConfig: () => req('/api/stores/pixel-config'),
  createCustomer: (body: any) => req('/api/customers', 'POST', body),
  updateCustomer: (id: string, body: any) => req(`/api/customers/${id}`, 'PATCH', body),
  createProduct: (body: any) => req('/api/products', 'POST', body),
  updateProduct: (id: string, body: any) => req(`/api/products/${id}`, 'PATCH', body),
  updateProductStatus: (id: string, status: string) => req(`/api/products/${id}/status`, 'PATCH', { status }),
  updateVariant: (pid: string, vid: string, body: any) => req(`/api/products/${pid}/variants/${vid}`, 'PATCH', body),
  stock: () => req('/api/stock/overview'),
  offers: (): Promise<any[]> => req('/api/offers?limit=100&offset=0'),
  abandonedStats: () => req('/api/abandoned-orders/stats'),
  abandoned: (): Promise<any[]> => req('/api/abandoned-orders?limit=100&offset=0').catch(() => []),
  shippingProfiles: (): Promise<any[]> => req('/api/shipping-profiles?limit=100&offset=0'),
  companies: (): Promise<any[]> => req('/api/delivery-companies?limit=100&offset=0'),
  drivers: (): Promise<any[]> => req('/api/drivers?limit=100&offset=0'),
};

export const STATUS_LABEL: Record<string, string> = {
  new: 'جديد', confirmed: 'مؤكد', unreachable: 'لا يرد', preparing: 'قيد التحضير',
  ready: 'جاهز', assigned: 'عُيّن سائق', dispatched: 'أُرسل', out_for_delivery: 'في الطريق',
  delivered: 'تم التوصيل', returned: 'مرتجع', cancelled: 'ملغي',
};
export const STATUS_COLOR: Record<string, string> = {
  new: '#9CA1A6', confirmed: '#A68CFA', unreachable: '#F2A199', preparing: '#F0D489',
  ready: '#8AB5F7', assigned: '#CCBDF7', dispatched: '#5EBFC7', out_for_delivery: '#F5BF91',
  delivered: '#59D98C', returned: '#F5BAB2', cancelled: '#6E7075',
};
export const STATUS_FLOW = ['new', 'confirmed', 'preparing', 'ready', 'assigned', 'dispatched', 'out_for_delivery', 'delivered'];
export const ALL_STATUSES = ['new', 'confirmed', 'unreachable', 'preparing', 'ready', 'assigned', 'dispatched', 'out_for_delivery', 'delivered', 'returned', 'cancelled'];
export const IN_PROGRESS = ['new', 'confirmed', 'unreachable', 'preparing', 'ready', 'assigned', 'dispatched', 'out_for_delivery'];
export function nextStatus(s?: string): string | null {
  const i = STATUS_FLOW.indexOf(s || '');
  return i >= 0 && i + 1 < STATUS_FLOW.length ? STATUS_FLOW[i + 1] : null;
}
export function dzd(n: any): string {
  if (n === null || n === undefined || n === '') return '—';
  const v = Number(n);
  if (Number.isNaN(v)) return '—';
  return `${v.toLocaleString('fr-DZ')} دج`;
}
export function orderTotalOf(o: any): number {
  if (o?.codAmount !== null && o?.codAmount !== undefined) return Number(o.codAmount) || 0;
  return (Number(o?.price) || 0) + (Number(o?.deliveryFee) || 0);
}
export function fmtDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const now = new Date();
  const hm = d.toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === now.toDateString()) return `اليوم ${hm}`;
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return `أمس ${hm}`;
  return `${d.toLocaleDateString('fr-DZ', { day: '2-digit', month: '2-digit' })} ${hm}`;
}
export function relTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return 'الآن';
  if (m < 60) return `منذ ${m} دقيقة`;
  const h = Math.round(m / 60);
  if (h < 24) return `منذ ${h} ساعة`;
  const days = Math.round(h / 24);
  return `منذ ${days} يوم`;
}
export function waNumber(phone?: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.startsWith('213')) return digits;
  if (digits.startsWith('0')) return '213' + digits.slice(1);
  return digits;
}
export function variantLabel(v: any): string {
  if (!v) return '';
  if (v.label) return v.label;
  const vars = v.variations;
  if (vars && typeof vars === 'object') {
    return Object.values(vars).map((x: any) => (x && typeof x === 'object' ? x.value ?? '' : String(x ?? ''))).filter(Boolean).join(' · ');
  }
  return v.name || v.sku || '';
}

export function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
