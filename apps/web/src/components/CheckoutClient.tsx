'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { Locale } from '@dsweb/types';
import { Link } from '@/i18n/navigation';
import { cart, useCart } from '@/lib/cart';
import { fetchQuote, submitCheckout, type Quote, type CheckoutResult } from '@/lib/shop';

const inputCls =
  'w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand';

type Fulfillment = 'delivery' | 'pickup';

export function CheckoutClient({ locale }: { locale: Locale }) {
  const t = useTranslations('shop');
  const items = useCart();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckoutResult | null>(null);
  const [fulfillment, setFulfillment] = useState<Fulfillment>('delivery');
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    state: 'MA',
    zip: '',
    token: 'tok_demo_ok',
  });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const refreshQuote = useCallback(async () => {
    if (items.length === 0) {
      setQuote(null);
      return;
    }
    const q = await fetchQuote(
      items.map((i) => ({ sku_code: i.sku_code, quantity: i.quantity })),
      undefined,
      fulfillment,
    );
    setQuote(q);
  }, [items, fulfillment]);

  useEffect(() => {
    void refreshQuote();
  }, [refreshQuote]);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';
    fetch(`${base}/public/settings`)
      .then((r) => r.json())
      .then((j) => setDeliveryFee(Number(j?.data?.['shipping.delivery_fee'] ?? 0)))
      .catch(() => undefined);
  }, []);

  const placeOrder = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await submitCheckout({
        items: items.map((i) => ({ sku_code: i.sku_code, quantity: i.quantity })),
        customer: {
          email: form.email,
          first_name: form.first_name,
          last_name: form.last_name,
          phone: form.phone,
        },
        fulfillment,
        shipping_address:
          fulfillment === 'delivery'
            ? { street: form.street, city: form.city, state: form.state, zip: form.zip }
            : undefined,
        payment_token: form.token,
        locale,
      });
      cart.clear();
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand text-2xl text-white">
          ✓
        </div>
        <h1 className="mt-5 text-2xl font-semibold text-brand-dark">{t('orderPlaced')}</h1>
        <p className="mt-2 text-sm text-gray-500">{t('orderNumber')}</p>
        <p className="text-lg font-semibold text-brand">{result.order_number}</p>
        <p className="mx-auto mt-4 max-w-md text-gray-600">{t('thankYou')}</p>
        <Link href="/products" className="mt-6 inline-block text-sm font-medium text-brand-mid hover:underline">
          {t('continueShopping')}
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
        <p className="text-gray-500">{t('emptyCart')}</p>
        <Link href="/products" className="mt-4 inline-block text-brand-mid hover:underline">
          {t('products')} →
        </Link>
      </div>
    );
  }

  const canSubmit =
    form.email &&
    form.first_name &&
    form.token &&
    (fulfillment === 'pickup' || (form.street && form.city && form.zip));

  return (
    <div className="grid gap-8 md:grid-cols-5">
      {/* 表单 */}
      <div className="space-y-6 md:col-span-3">
        <h1 className="text-2xl font-bold text-brand-dark">{t('checkout')}</h1>

        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-3 font-semibold">{t('contact')}</h2>
          <div className="grid grid-cols-2 gap-3">
            <input className={inputCls} placeholder={t('firstName')} value={form.first_name} onChange={(e) => set('first_name', e.target.value)} />
            <input className={inputCls} placeholder={t('lastName')} value={form.last_name} onChange={(e) => set('last_name', e.target.value)} />
            <input className={`${inputCls} col-span-2`} placeholder={t('email')} value={form.email} onChange={(e) => set('email', e.target.value)} />
            <input className={`${inputCls} col-span-2`} placeholder={t('phone')} value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </div>
        </section>

        {/* 履约方式：送货上门(加运费) / Burlington 门店自提+培训 */}
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-3 font-semibold">{t('fulfillment')}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setFulfillment('delivery')}
              className={`rounded-lg border p-4 text-left transition-all ${
                fulfillment === 'delivery' ? 'border-brand bg-brand-light' : 'border-gray-200 hover:border-brand-mid'
              }`}
            >
              <span className="block font-semibold text-brand-dark">
                🚚 {t('delivery')}
                {deliveryFee > 0 && <span className="ml-1 text-brand">+${deliveryFee}</span>}
              </span>
              <span className="mt-1 block text-sm text-gray-500">{t('deliveryDesc')}</span>
            </button>
            <button
              type="button"
              onClick={() => setFulfillment('pickup')}
              className={`rounded-lg border p-4 text-left transition-all ${
                fulfillment === 'pickup' ? 'border-brand bg-brand-light' : 'border-gray-200 hover:border-brand-mid'
              }`}
            >
              <span className="block font-semibold text-brand-dark">🏬 {t('pickup')}</span>
              <span className="mt-1 block text-sm text-gray-500">{t('pickupDesc')}</span>
            </button>
          </div>

          {fulfillment === 'delivery' && (
            <div className="mt-4 grid grid-cols-6 gap-3">
              <input className={`${inputCls} col-span-6`} placeholder={t('street')} value={form.street} onChange={(e) => set('street', e.target.value)} />
              <input className={`${inputCls} col-span-3`} placeholder={t('city')} value={form.city} onChange={(e) => set('city', e.target.value)} />
              <input className={`${inputCls} col-span-1`} placeholder={t('state')} value={form.state} onChange={(e) => set('state', e.target.value)} />
              <input className={`${inputCls} col-span-2`} placeholder={t('zip')} value={form.zip} onChange={(e) => set('zip', e.target.value)} />
            </div>
          )}
        </section>

        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-3 font-semibold">{t('payment')}</h2>
          <input className={inputCls} placeholder={t('paymentToken')} value={form.token} onChange={(e) => set('token', e.target.value)} />
          <p className="mt-2 text-xs text-gray-400">{t('cardHint')}</p>
        </section>

        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      </div>

      {/* 摘要 */}
      <div className="md:col-span-2">
        <div className="sticky top-24 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-3 font-semibold">{t('cart')}</h2>
          <ul className="space-y-3">
            {items.map((i) => (
              <li key={i.sku_code} className="flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium text-gray-800">{i.name}</div>
                  <div className="mt-1 flex items-center gap-2 text-gray-400">
                    <button onClick={() => cart.setQty(i.sku_code, i.quantity - 1)} className="rounded border px-2">−</button>
                    <span>{i.quantity}</span>
                    <button onClick={() => cart.setQty(i.sku_code, i.quantity + 1)} className="rounded border px-2">+</button>
                  </div>
                </div>
                <span className="text-gray-700">${(i.price * i.quantity).toLocaleString()}</span>
              </li>
            ))}
          </ul>
          {quote && (
            <dl className="mt-5 space-y-1 border-t border-gray-100 pt-4 text-sm">
              <Row label={t('subtotal')} value={quote.subtotal} />
              <Row label={t('tax')} value={quote.tax} />
              <Row label={t('shippingFee')} value={quote.shipping} />
              {quote.discount > 0 && <Row label={t('discount')} value={-quote.discount} />}
              <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-semibold text-brand-dark">
                <span>{t('total')}</span>
                <span>${quote.total.toLocaleString()}</span>
              </div>
            </dl>
          )}
          <button
            onClick={placeOrder}
            disabled={!canSubmit || submitting}
            className="mt-6 w-full rounded-md bg-brand px-6 py-3 font-medium text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {submitting ? t('placing') : t('placeOrder')}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-gray-500">
      <span>{label}</span>
      <span>${value.toLocaleString()}</span>
    </div>
  );
}
