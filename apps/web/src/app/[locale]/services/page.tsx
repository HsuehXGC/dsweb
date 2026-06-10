import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('pages');
  const items = t.raw('services.items') as Array<{ name: string; desc: string }>;

  return (
    <div className="mx-auto max-w-container px-6 py-16">
      <h1 className="text-3xl font-bold text-brand-dark">{t('services.title')}</h1>
      <p className="mt-3 max-w-2xl text-gray-600">{t('services.subtitle')}</p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((s, i) => (
          <div key={i} className="rounded-xl border border-gray-200 p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-light text-brand">
              {i + 1}
            </div>
            <h2 className="mt-4 text-lg font-semibold text-gray-900">{s.name}</h2>
            <p className="mt-2 text-sm text-gray-500">{s.desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center">
        <Link
          href="/book"
          className="inline-block rounded-md bg-brand px-6 py-3 font-medium text-white hover:bg-brand-dark"
        >
          {t('cta')}
        </Link>
      </div>
    </div>
  );
}
