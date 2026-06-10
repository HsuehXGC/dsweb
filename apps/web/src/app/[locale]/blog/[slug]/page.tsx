import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { fetchPost } from '@/lib/cms';

export const dynamic = 'force-dynamic';

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('pages');
  const post = await fetchPost(slug);
  if (!post) notFound();
  const c = (post.content as Record<string, { title?: string; body?: string }>)[locale] ?? post.content.en ?? {};

  return (
    <article className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/blog" className="text-sm text-brand-mid hover:underline">
        ← {t('blog.back')}
      </Link>
      {post.category && (
        <span className="mt-6 block text-xs uppercase tracking-wide text-brand">{post.category}</span>
      )}
      <h1 className="mt-2 text-3xl font-bold text-brand-dark">{c.title ?? post.slug}</h1>
      {post.publishedAt && (
        <p className="mt-2 text-sm text-gray-400">{new Date(post.publishedAt).toLocaleDateString()}</p>
      )}
      <div className="mt-8 leading-relaxed text-gray-700">{c.body ?? ''}</div>
    </article>
  );
}
