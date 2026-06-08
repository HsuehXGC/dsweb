import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

/**
 * 主页 —— 对应需求文档 C1，9 个 section。
 * 第一阶段为骨架：Hero 用 i18n 文案，其余 section 占位，
 * 后续接入 M1 CMS（GET /api/v1/public/pages/home）按 schema 渲染。
 */
const HOME_SECTIONS = [
  'hero',
  'value_props',
  'how_it_works',
  'products',
  'membership',
  'weekly_visit',
  'testimonials',
  'service_area',
  'cta',
] as const;

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('home');

  return (
    <>
      {/* Section 1: Hero */}
      <section className="bg-brand-light">
        <div className="mx-auto max-w-6xl px-4 py-24 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-brand-dark sm:text-5xl">
            {t('hero.title')}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">{t('hero.subtitle')}</p>
          <div className="mt-8">
            <Link
              href="/book"
              className="rounded-md bg-brand px-6 py-3 text-base font-medium text-white hover:bg-brand-dark"
            >
              {t('hero.cta')}
            </Link>
          </div>
        </div>
      </section>

      {/* Sections 2-9: CMS 占位（后续从 M1 CMS 拉取并按 schema 渲染） */}
      {HOME_SECTIONS.slice(1).map((key, idx) => (
        <section key={key} className="border-b border-gray-100">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">
              Section {idx + 2} · {key}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-gray-900">{t('sections.intro')}</h2>
            <p className="mt-3 text-gray-500">{t('sections.placeholder')}</p>
          </div>
        </section>
      ))}
    </>
  );
}
