'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { customerApi, customerSession, type CustomerUser } from '@/lib/customer';

const inputCls =
  'w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand';

export function AccountClient() {
  const [user, setUser] = useState<CustomerUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUser(customerSession.user);
    setReady(true);
    const sync = () => setUser(customerSession.user);
    window.addEventListener('dsweb_customer_changed', sync);
    return () => window.removeEventListener('dsweb_customer_changed', sync);
  }, []);

  if (!ready) return null;
  return user ? <Dashboard user={user} /> : <AuthForms />;
}

function AuthForms() {
  const t = useTranslations('account');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ email: '', password: '', first_name: '', last_name: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res =
        mode === 'login'
          ? await customerApi.login(form.email, form.password)
          : await customerApi.register(form);
      customerSession.save(res.access_token, res.customer);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-2xl bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-brand-dark">{mode === 'login' ? t('login') : t('register')}</h1>
      <div className="mt-6 space-y-3">
        {mode === 'register' && (
          <div className="grid grid-cols-2 gap-3">
            <input className={inputCls} placeholder={t('firstName')} value={form.first_name} onChange={(e) => set('first_name', e.target.value)} />
            <input className={inputCls} placeholder={t('lastName')} value={form.last_name} onChange={(e) => set('last_name', e.target.value)} />
          </div>
        )}
        <input className={inputCls} placeholder={t('email')} value={form.email} onChange={(e) => set('email', e.target.value)} />
        <input type="password" className={inputCls} placeholder={t('password')} value={form.password} onChange={(e) => set('password', e.target.value)} />
        {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <button onClick={submit} disabled={busy} className="w-full rounded-md bg-brand px-6 py-3 font-medium text-white hover:bg-brand-dark disabled:opacity-50">
          {mode === 'login' ? t('login') : t('register')}
        </button>
        <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="w-full text-sm text-brand-mid hover:underline">
          {mode === 'login' ? t('noAccount') : t('haveAccount')}
        </button>
      </div>
    </div>
  );
}

function Dashboard({ user }: { user: CustomerUser }) {
  const t = useTranslations('account');
  const [tab, setTab] = useState<'orders' | 'subscriptions' | 'devices'>('orders');
  const [orders, setOrders] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);

  const reload = useCallback(async () => {
    const [o, s, d] = await Promise.all([
      customerApi.orders().catch(() => []),
      customerApi.subscriptions().catch(() => []),
      customerApi.devices().catch(() => []),
    ]);
    setOrders(o);
    setSubs(s);
    setDevices(d);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const subscribe = async () => {
    await customerApi.subscribe('smartlawn-membership', 'tok_demo_ok');
    await reload();
  };
  const act = async (fn: Promise<unknown>) => {
    await fn;
    await reload();
  };

  const activeSub = subs.find((s) => s.status === 'active' || s.status === 'paused' || s.status === 'past_due');

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{t('welcome')}</p>
          <h1 className="text-2xl font-bold text-brand-dark">
            {user.first_name ?? user.email}
          </h1>
        </div>
        <button onClick={() => customerSession.clear()} className="text-sm text-gray-500 hover:text-gray-700">
          {t('logout')}
        </button>
      </div>

      <div className="mt-6 flex gap-2 border-b border-gray-200">
        {(['orders', 'subscriptions', 'devices'] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm font-medium ${tab === k ? 'border-b-2 border-brand text-brand' : 'text-gray-500'}`}
          >
            {t(k === 'orders' ? 'tabOrders' : k === 'subscriptions' ? 'tabSubscriptions' : 'tabDevices')}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'orders' && (
          orders.length === 0 ? <Empty text={t('noOrders')} /> : (
            <ul className="space-y-3">
              {orders.map((o) => (
                <li key={o.id} className="flex items-center justify-between rounded-lg bg-white p-4 shadow-sm">
                  <div>
                    <span className="font-medium">{o.number}</span>
                    <span className="ml-3 rounded bg-brand-light px-2 py-0.5 text-xs text-brand">{o.status}</span>
                    {o.type === 'subscription' && <span className="ml-2 text-xs text-gray-400">sub</span>}
                  </div>
                  <span className="font-semibold text-brand-dark">${Number(o.total).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )
        )}

        {tab === 'subscriptions' && (
          activeSub ? (
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">SmartLawn Membership · ${Number(activeSub.planPrice)}/mo</span>
                <span className="rounded-full bg-brand-light px-3 py-1 text-sm text-brand">
                  {t(`subStatus_${activeSub.status}`)}
                </span>
              </div>
              {activeSub.nextBillingAt && (
                <p className="mt-2 text-sm text-gray-500">
                  {t('nextBilling')}: {new Date(activeSub.nextBillingAt).toLocaleDateString()}
                </p>
              )}
              <div className="mt-4 flex gap-2">
                {activeSub.status === 'active' && (
                  <>
                    <button onClick={() => act(customerApi.pauseSub(activeSub.uuid))} className="rounded border border-gray-300 px-4 py-1.5 text-sm">{t('pause')}</button>
                    <button onClick={() => act(customerApi.cancelSub(activeSub.uuid))} className="rounded border border-red-300 px-4 py-1.5 text-sm text-red-600">{t('cancel')}</button>
                  </>
                )}
                {activeSub.status === 'paused' && (
                  <button onClick={() => act(customerApi.resumeSub(activeSub.uuid))} className="rounded bg-brand px-4 py-1.5 text-sm text-white">{t('resume')}</button>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-white p-6 text-center shadow-sm">
              <p className="text-gray-500">{t('noSubs')}</p>
              <button onClick={subscribe} className="mt-4 rounded-md bg-brand px-6 py-3 font-medium text-white hover:bg-brand-dark">
                {t('subscribe')}
              </button>
            </div>
          )
        )}

        {tab === 'devices' && (
          devices.length === 0 ? <Empty text={t('noDevices')} /> : (
            <ul className="space-y-3">
              {devices.map((d) => (
                <li key={d.id} className="rounded-lg bg-white p-4 shadow-sm">
                  <span className="font-medium">{d.model}</span>
                  <span className="ml-3 text-sm text-gray-500">{d.serialNumber}</span>
                </li>
              ))}
            </ul>
          )
        )}
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-xl bg-white p-10 text-center text-gray-500 shadow-sm">{text}</div>;
}
