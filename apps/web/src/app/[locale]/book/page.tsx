import { setRequestLocale } from 'next-intl/server';
import type { Locale } from '@dsweb/types';
import { BookingForm } from '@/components/BookingForm';

export default async function BookPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="bg-brand-light">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <BookingForm locale={locale as Locale} />
      </div>
    </div>
  );
}
