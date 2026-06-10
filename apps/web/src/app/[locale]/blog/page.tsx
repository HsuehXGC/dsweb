import { setRequestLocale, getTranslations } from 'next-intl/server';
import type { Locale } from '@dsweb/types';
import { Link } from '@/i18n/navigation';
import { fetchPosts } from '@/lib/cms';

export const dynamic = 'force-dynamic';

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('pages');
  const posts = await fetchPosts();

  return (
    <div className="mx-auto max-w-container px-6 py-16">
      <h1 className="text-3xl font-bold text-brand-dark">{t('blog.title')}</h1>
      <p className="mt-3 text-gray-600">{t('blog.subtitle')}</p>

      {posts.length === 0 ? (
        <p className="mt-10 text-gray-400">{t('blog.empty')}</p>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => {
            const c = p.content[locale as Locale] ?? p.content.en ?? {};
            return (
              <Link
                key={p.uuid}
                href={`/blog/${p.slug}`}
                className="flex flex-col rounded-xl border border-gray-200 p-6 transition-colors hover:border-brand-mid"
              >
                <div className="flex aspect-video items-center justify-center rounded-lg bg-brand-light text-3xl">
                  📝
                </div>
                {p.category && (
                  <span className="mt-3 text-xs uppercase tracking-wide text-brand">{p.category}</span>
                )}
                <h2 className="mt-1 font-semibold text-gray-900">{c.title ?? p.slug}</h2>
                <span className="mt-3 text-sm text-brand-mid">{t('blog.readMore')} →</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
