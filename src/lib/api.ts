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
  orders: (): Promise<any[]> => req('/api/orders'),
  setStatus: (id: string, status: string) => req(`/api/orders/${id}/status`, 'PATCH', { status }),
  products: (): Promise<any[]> => req('/api/products'),
  customers: (): Promise<any[]> => req('/api/customers'),
  customerOrders: (id: string): Promise<any[]> => req(`/api/customers/${id}/orders`),
  store: () => req('/api/stores/me'),
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
export const ALL_STATUSES = [...STATUS_FLOW, 'unreachable', 'returned', 'cancelled'];
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
export function waNumber(phone?: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.startsWith('213')) return digits;
  if (digits.startsWith('0')) return '213' + digits.slice(1);
  return digits;
}
