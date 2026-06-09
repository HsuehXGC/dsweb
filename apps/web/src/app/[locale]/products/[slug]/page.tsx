import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import type { Locale } from '@dsweb/types';
import { Link } from '@/i18n/navigation';
import { fetchProduct } from '@/lib/shop';
import { AddToCartButton } from '@/components/AddToCartButton';

export const dynamic = 'force-dynamic';

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('shop');
  const p = await fetchProduct(slug);
  if (!p) notFound();

  const price = Number(p.skus[0]?.price ?? p.basePrice);
  const desc = p.description?.[locale as Locale] ?? p.description?.en ?? '';

  return (
    <div className="mx-auto max-w-container px-6 py-16">
      <Link href="/products" className="text-sm text-brand-mid hover:underline">
        ← {t('products')}
      </Link>
      <div className="mt-6 grid gap-10 md:grid-cols-2">
        <div className="flex aspect-square items-center justify-center rounded-2xl bg-brand-light text-8xl">
          🤖
        </div>
        <div>
          <h1 className="text-3xl font-bold text-brand-dark">{p.name}</h1>
          <p className="mt-4 text-2xl font-semibold text-brand">
            ${price.toLocaleString()}
            {p.type === 'subscription' && <span className="text-base text-gray-400">/mo</span>}
          </p>
          <p className="mt-6 text-gray-600">{desc}</p>
          <div className="mt-8">
            {p.type === 'one_time' && p.skus[0] ? (
              <AddToCartButton skuCode={p.skus[0].code} name={p.name} price={price} block />
            ) : (
              <Link
                href="/membership"
                className="inline-block rounded-md bg-brand px-6 py-3 font-medium text-white hover:bg-brand-dark"
              >
                {t('subscription')}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
