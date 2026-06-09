'use client';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';
const TOKEN_KEY = 'dsweb_customer_token';
const USER_KEY = 'dsweb_customer';

export interface CustomerUser {
  uuid: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

export const customerSession = {
  get token() {
    return typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY);
  },
  get user(): CustomerUser | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as CustomerUser) : null;
  },
  save(token: string, user: CustomerUser) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event('dsweb_customer_changed'));
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.dispatchEvent(new Event('dsweb_customer_changed'));
  },
};

async function req<T>(path: string, options: RequestInit = {}, auth = false): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (auth && customerSession.token) headers.Authorization = `Bearer ${customerSession.token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message ?? `Request failed (${res.status})`);
  return (json.data ?? json) as T;
}

export const customerApi = {
  register(body: Record<string, unknown>) {
    return req<{ access_token: string; customer: CustomerUser }>('/public/customer/register', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
  login(email: string, password: string) {
    return req<{ access_token: string; customer: CustomerUser }>('/public/customer/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
  orders() {
    return req<any[]>('/customer/orders', {}, true);
  },
  subscriptions() {
    return req<any[]>('/customer/subscriptions', {}, true);
  },
  devices() {
    return req<any[]>('/customer/devices', {}, true);
  },
  workOrders() {
    return req<any[]>('/customer/work-orders', {}, true);
  },
  subscribe(productSlug: string, paymentToken: string) {
    return req('/customer/subscriptions/subscribe', {
      method: 'POST',
      body: JSON.stringify({ product_slug: productSlug, payment_token: paymentToken }),
    }, true);
  },
  pauseSub(uuid: string) {
    return req(`/customer/subscriptions/${uuid}/pause`, { method: 'POST', body: '{}' }, true);
  },
  resumeSub(uuid: string) {
    return req(`/customer/subscriptions/${uuid}/resume`, { method: 'POST', body: '{}' }, true);
  },
  cancelSub(uuid: string) {
    return req(`/customer/subscriptions/${uuid}/cancel`, { method: 'POST', body: JSON.stringify({ immediate: false }) }, true);
  },
};
