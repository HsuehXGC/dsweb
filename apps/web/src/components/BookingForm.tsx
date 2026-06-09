'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { Locale } from '@dsweb/types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';
const TOTAL_STEPS = 5;

interface FormState {
  type: 'standard' | 'demo_day' | 'same_day';
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  acres: string;
  slope: '' | 'flat' | 'gentle' | 'moderate' | 'steep';
  wifi: '' | 'yes' | 'no' | 'unknown';
  notes: string;
}

const EMPTY: FormState = {
  type: 'standard',
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  street: '',
  city: '',
  state: 'MA',
  zip: '',
  acres: '',
  slope: '',
  wifi: '',
  notes: '',
};

export function BookingForm({ locale }: { locale: Locale }) {
  const t = useTranslations('book');
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ confirmation_number: string; next_steps: string } | null>(
    null,
  );
  const [submitError, setSubmitError] = useState<string | null>(null);

  const update = (key: keyof FormState, value: string) =>
    setForm((p) => ({ ...p, [key]: value }));

  const validateStep = (): boolean => {
    const e: Record<string, string> = {};
    const required = (k: keyof FormState) => {
      if (!String(form[k]).trim()) e[k] = t('required');
    };
    if (step === 1) {
      (['first_name', 'last_name', 'email', 'phone'] as const).forEach(required);
      if (form.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) e.email = t('invalidEmail');
    }
    if (step === 2) (['street', 'city', 'state', 'zip'] as const).forEach(required);
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (validateStep()) setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const submit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`${API_BASE}/public/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: form.type,
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          phone: form.phone,
          address: { street: form.street, city: form.city, state: form.state, zip: form.zip },
          property_acres: form.acres ? Number(form.acres) : undefined,
          slope: form.slope || undefined,
          wifi_status: form.wifi || undefined,
          notes: form.notes || undefined,
          locale,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? 'Request failed');
      setResult(json.data);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Request failed');
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
        <h2 className="mt-5 text-2xl font-semibold text-brand-dark">{t('successTitle')}</h2>
        <p className="mt-2 text-sm text-gray-500">{t('confirmation')}</p>
        <p className="text-lg font-semibold text-brand">{result.confirmation_number}</p>
        <p className="mx-auto mt-4 max-w-md text-gray-600">{result.next_steps}</p>
        <button
          onClick={() => {
            setForm(EMPTY);
            setResult(null);
            setStep(0);
          }}
          className="mt-6 text-sm font-medium text-brand-mid hover:underline"
        >
          {t('bookAnother')}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-brand-dark">{t('title')}</h1>
      <p className="mt-2 text-gray-600">{t('subtitle')}</p>

      {/* 进度条 */}
      <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full bg-brand transition-all"
          style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-gray-400">
        {t('step', { current: step + 1, total: TOTAL_STEPS })}
      </p>

      <div className="mt-6 min-h-[220px]">
        {step === 0 && (
          <Fieldset title={t('typeTitle')}>
            <div className="space-y-3">
              {(['standard', 'demo_day', 'same_day'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => update('type', type)}
                  className={`w-full rounded-lg border p-4 text-left transition-all ${
                    form.type === type
                      ? 'border-brand bg-brand-light'
                      : 'border-gray-200 hover:border-brand-mid'
                  }`}
                >
                  <span className="block font-semibold text-brand-dark">{t(`type_${type}`)}</span>
                  <span className="mt-1 block text-sm text-gray-500">{t(`type_${type}_desc`)}</span>
                </button>
              ))}
            </div>
          </Fieldset>
        )}

        {step === 1 && (
          <Fieldset title={t('contactTitle')}>
            <div className="grid grid-cols-2 gap-4">
              <Field label={t('firstName')} error={errors.first_name}>
                <input className={inputCls} value={form.first_name} onChange={(e) => update('first_name', e.target.value)} />
              </Field>
              <Field label={t('lastName')} error={errors.last_name}>
                <input className={inputCls} value={form.last_name} onChange={(e) => update('last_name', e.target.value)} />
              </Field>
            </div>
            <Field label={t('email')} error={errors.email}>
              <input type="email" className={inputCls} value={form.email} onChange={(e) => update('email', e.target.value)} />
            </Field>
            <Field label={t('phone')} error={errors.phone}>
              <input className={inputCls} value={form.phone} onChange={(e) => update('phone', e.target.value)} />
            </Field>
          </Fieldset>
        )}

        {step === 2 && (
          <Fieldset title={t('addressTitle')}>
            <Field label={t('street')} error={errors.street}>
              <input className={inputCls} value={form.street} onChange={(e) => update('street', e.target.value)} />
            </Field>
            <div className="grid grid-cols-3 gap-4">
              <Field label={t('city')} error={errors.city}>
                <input className={inputCls} value={form.city} onChange={(e) => update('city', e.target.value)} />
              </Field>
              <Field label={t('state')} error={errors.state}>
                <input className={inputCls} value={form.state} onChange={(e) => update('state', e.target.value)} />
              </Field>
              <Field label={t('zip')} error={errors.zip}>
                <input className={inputCls} value={form.zip} onChange={(e) => update('zip', e.target.value)} />
              </Field>
            </div>
          </Fieldset>
        )}

        {step === 3 && (
          <Fieldset title={t('propertyTitle')}>
            <Field label={t('acres')}>
              <input type="number" min="0" step="0.1" className={inputCls} value={form.acres} onChange={(e) => update('acres', e.target.value)} />
            </Field>
            <Field label={t('slope')}>
              <div className="flex flex-wrap gap-2">
                {(['flat', 'gentle', 'moderate', 'steep'] as const).map((s) => (
                  <Chip key={s} active={form.slope === s} onClick={() => update('slope', s)}>
                    {t(`slope_${s}`)}
                  </Chip>
                ))}
              </div>
            </Field>
            <Field label={t('wifi')}>
              <div className="flex flex-wrap gap-2">
                {(['yes', 'no', 'unknown'] as const).map((w) => (
                  <Chip key={w} active={form.wifi === w} onClick={() => update('wifi', w)}>
                    {t(`wifi_${w}`)}
                  </Chip>
                ))}
              </div>
            </Field>
          </Fieldset>
        )}

        {step === 4 && (
          <Fieldset title={t('notes')}>
            <textarea
              className={`${inputCls} min-h-[120px]`}
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
            />
            {submitError && (
              <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                {t('errorTitle')}: {submitError}
              </p>
            )}
          </Fieldset>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="mt-8 flex items-center justify-between">
        {step > 0 ? (
          <button onClick={back} className="text-sm font-medium text-gray-500 hover:text-gray-700">
            ← {t('back')}
          </button>
        ) : (
          <span />
        )}
        {step < TOTAL_STEPS - 1 ? (
          <button
            onClick={next}
            className="rounded-md bg-brand px-6 py-3 font-medium text-white hover:bg-brand-dark"
          >
            {t('next')}
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={submitting}
            className="rounded-md bg-brand px-6 py-3 font-medium text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {submitting ? t('submitting') : t('submit')}
          </button>
        )}
      </div>
    </div>
  );
}

const inputCls =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand';

function Fieldset({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {children}
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-500">{error}</span>}
    </label>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-1.5 text-sm transition-all ${
        active ? 'border-brand bg-brand text-white' : 'border-gray-300 text-gray-600 hover:border-brand-mid'
      }`}
    >
      {children}
    </button>
  );
}
