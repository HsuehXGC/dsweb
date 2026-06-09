import { setRequestLocale, getTranslations } from 'next-intl/server';
import type { Locale } from '@dsweb/types';
import { Link } from '@/i18n/navigation';
import { fetchProducts } from '@/lib/shop';
import { AddToCartButton } from '@/components/AddToCartButton';

export const dynamic = 'force-dynamic';

export default async function ProductsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('shop');
  const products = await fetchProducts();

  return (
    <div className="mx-auto max-w-container px-6 py-16">
      <h1 className="text-3xl font-bold text-brand-dark">{t('products')}</h1>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => {
          const price = Number(p.skus[0]?.price ?? p.basePrice);
          const desc = p.description?.[locale as Locale] ?? p.description?.en ?? '';
          return (
            <div key={p.id} className="flex flex-col rounded-xl border border-gray-200 p-6">
              <div className="flex aspect-video items-center justify-center rounded-lg bg-brand-light text-4xl">
                🤖
              </div>
              <div className="mt-4 flex-1">
                <Link href={`/products/${p.slug}`} className="font-semibold text-gray-900 hover:text-brand">
                  {p.name}
                </Link>
                {p.type === 'subscription' && (
                  <span className="ml-2 rounded bg-brand-light px-2 py-0.5 text-xs text-brand">
                    {t('subscription')}
                  </span>
                )}
                <p className="mt-2 line-clamp-2 text-sm text-gray-500">{desc}</p>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-lg font-semibold text-brand-dark">
                  ${price.toLocaleString()}
                  {p.type === 'subscription' && <span className="text-sm text-gray-400">/mo</span>}
                </span>
                {p.type === 'one_time' && p.skus[0] && (
                  <AddToCartButton skuCode={p.skus[0].code} name={p.name} price={price} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
