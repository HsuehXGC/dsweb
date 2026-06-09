import { setRequestLocale } from 'next-intl/server';
import type { Locale } from '@dsweb/types';
import { CheckoutClient } from '@/components/CheckoutClient';

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <CheckoutClient locale={locale as Locale} />
    </div>
  );
}
