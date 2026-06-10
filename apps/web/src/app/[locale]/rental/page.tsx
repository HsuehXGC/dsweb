import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export default async function RentalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('pages');
  const tiers = t.raw('rental.tiers') as Array<{ name: string; price: string; desc: string }>;

  return (
    <div className="mx-auto max-w-container px-6 py-16">
      <h1 className="text-3xl font-bold text-brand-dark">{t('rental.title')}</h1>
      <p className="mt-3 max-w-2xl text-gray-600">{t('rental.subtitle')}</p>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {tiers.map((tier, i) => (
          <div key={i} className="flex flex-col rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900">{tier.name}</h2>
            <p className="mt-2 text-2xl font-bold text-brand">{tier.price}</p>
            <p className="mt-3 flex-1 text-sm text-gray-500">{tier.desc}</p>
            <Link
              href="/book"
              className="mt-6 rounded-md border border-brand px-4 py-2 text-center text-sm font-medium text-brand hover:bg-brand-light"
            >
              {t('cta')}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
