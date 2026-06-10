import type { Locale } from '@dsweb/types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

export interface Sku {
  id: string;
  code: string;
  price: string | null;
}
export interface Product {
  id: string;
  slug: string;
  name: string;
  type: 'one_time' | 'subscription';
  basePrice: string;
  description: Partial<Record<Locale, string>> | null;
  skus: Sku[];
}

export async function fetchProducts(): Promise<Product[]> {
  try {
    const res = await fetch(`${API_BASE}/public/products`, { cache: 'no-store' });
    if (!res.ok) return [];
    return (await res.json()).data as Product[];
  } catch {
    return [];
  }
}

export async function fetchProduct(slug: string): Promise<Product | null> {
  try {
    const res = await fetch(`${API_BASE}/public/products/${slug}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()).data as Product;
  } catch {
    return null;
  }
}

export interface Quote {
  lines: Array<{ sku_code: string; quantity: number; unit_price: number; total: number }>;
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
}

export async function fetchQuote(
  items: Array<{ sku_code: string; quantity: number }>,
  discountCode?: string,
  fulfillment: 'delivery' | 'pickup' = 'delivery',
): Promise<Quote | null> {
  const res = await fetch(`${API_BASE}/public/checkout/quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items, discount_code: discountCode, fulfillment }),
  });
  if (!res.ok) return null;
  return (await res.json()).data as Quote;
}

export interface CheckoutResult {
  order_uuid: string;
  order_number: string;
  total: number;
  status: string;
}

export async function submitCheckout(payload: Record<string, unknown>): Promise<CheckoutResult> {
  const res = await fetch(`${API_BASE}/public/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message ?? 'Checkout failed');
  return json.data as CheckoutResult;
}
