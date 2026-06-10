import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export default async function MembershipPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('pages');
  const benefits = t.raw('membership.benefits') as string[];

  return (
    <div className="bg-brand-light">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="overflow-hidden rounded-2xl bg-brand text-white shadow-sm">
          <div className="grid md:grid-cols-2">
            <div className="p-8">
              <h1 className="text-2xl font-bold">{t('membership.title')}</h1>
              <p className="mt-3 text-sm text-white/80">{t('membership.subtitle')}</p>
              <ul className="mt-6 space-y-2 text-sm">
                {benefits.map((b, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-brand-gold">✓</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col items-center justify-center bg-brand-dark p-8 text-center">
              <div className="flex items-end">
                <span className="text-5xl font-bold">{t('membership.price')}</span>
                <span className="mb-1 ml-1 text-white/70">{t('membership.unit')}</span>
              </div>
              <p className="mt-2 text-xs text-white/60">{t('membership.note')}</p>
              <Link
                href="/account"
                className="mt-6 rounded-md bg-white px-6 py-3 font-medium text-brand-dark hover:bg-gray-100"
              >
                {t('membership.cta')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
