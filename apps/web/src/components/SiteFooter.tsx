import { useTranslations } from 'next-intl';

export function SiteFooter() {
  const t = useTranslations('footer');
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-gray-100 bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-8 text-center text-sm text-gray-500">
        © {year} {t('rights')}
      </div>
    </footer>
  );
}
