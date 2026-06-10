import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('pages');

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold text-brand-dark">{t('about.title')}</h1>
      <p className="mt-6 text-lg leading-relaxed text-gray-600">{t('about.body')}</p>

      <div className="mt-10 rounded-2xl bg-brand-light p-8">
        <h2 className="text-xl font-semibold text-brand-dark">{t('about.promiseTitle')}</h2>
        <p className="mt-3 italic leading-relaxed text-gray-700">“{t('about.promise')}”</p>
        <p className="mt-4 text-sm text-gray-500">— DS SmartLawn Service, Founder</p>
      </div>

      <div className="mt-10 text-center">
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
