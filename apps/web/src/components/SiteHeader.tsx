'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname, useRouter } from '@/i18n/navigation';

export function SiteHeader() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (next: 'en' | 'zh') => {
    router.replace(pathname, { locale: next });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-xl font-bold text-brand">
          DS SmartLawn
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-gray-700 md:flex">
          <Link href="/products">{t('products')}</Link>
          <Link href="/services">{t('services')}</Link>
          <Link href="/membership">{t('membership')}</Link>
          <Link href="/rental">{t('rental')}</Link>
          <Link href="/blog">{t('blog')}</Link>
          <Link href="/about">{t('about')}</Link>
        </nav>
        <div className="flex items-center gap-3">
          <button
            onClick={() => switchLocale(locale === 'en' ? 'zh' : 'en')}
            className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
          >
            {locale === 'en' ? '中文' : 'EN'}
          </button>
          <Link
            href="/book"
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
          >
            {t('book')}
          </Link>
        </div>
      </div>
    </header>
  );
}
