'use client';

import { useEffect, useState } from 'react';

export interface CartItem {
  sku_code: string;
  name: string;
  price: number;
  quantity: number;
}

const KEY = 'dsweb_cart';
const EVENT = 'dsweb_cart_changed';

function read(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as CartItem[];
  } catch {
    return [];
  }
}

function write(items: CartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(EVENT));
}

export const cart = {
  items: read,
  add(item: Omit<CartItem, 'quantity'>, qty = 1) {
    const items = read();
    const existing = items.find((i) => i.sku_code === item.sku_code);
    if (existing) existing.quantity += qty;
    else items.push({ ...item, quantity: qty });
    write(items);
  },
  setQty(sku_code: string, qty: number) {
    let items = read();
    if (qty <= 0) items = items.filter((i) => i.sku_code !== sku_code);
    else items = items.map((i) => (i.sku_code === sku_code ? { ...i, quantity: qty } : i));
    write(items);
  },
  remove(sku_code: string) {
    write(read().filter((i) => i.sku_code !== sku_code));
  },
  clear() {
    write([]);
  },
};

/** React hook：订阅购物车变化 */
export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  useEffect(() => {
    const sync = () => setItems(read());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  return items;
}
