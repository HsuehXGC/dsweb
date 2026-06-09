import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@dsweb/types';
import { fetchPage } from '@/lib/cms';
import { SectionRenderer } from '@/components/sections/SectionRenderer';

// 内容来自 CMS，按请求动态渲染，保证后台编辑后刷新即见
export const dynamic = 'force-dynamic';

/**
 * 主页 —— 对应需求文档 C1。内容由 M1 CMS 提供：
 * SSR 拉取 GET /api/v1/public/pages/home，按 section.type 渲染。
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const page = await fetchPage('home');
  if (page?.seo?.title) {
    return { title: page.seo.title, description: page.seo.description ?? undefined };
  }
  const t = await getTranslations({ locale, namespace: 'home' });
  return { title: `DS SmartLawn — ${t('hero.title')}`, description: t('hero.subtitle') };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const page = await fetchPage('home');

  if (!page) {
    const t = await getTranslations('home');
    return (
      <div className="mx-auto max-w-container px-6 py-24 text-center">
        <h1 className="text-3xl font-bold text-brand-dark">{t('hero.title')}</h1>
        <p className="mt-4 text-gray-600">{t('sections.placeholder')}</p>
      </div>
    );
  }

  return (
    <>
      {page.sections.map((section, i) => (
        <SectionRenderer key={`${section.type}-${i}`} section={section} locale={locale as Locale} />
      ))}
    </>
  );
}
