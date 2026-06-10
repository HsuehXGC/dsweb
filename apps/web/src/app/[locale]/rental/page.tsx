import { setRequestLocale, getTranslations } from 'next-intl/server';
import { AddToCartButton } from '@/components/AddToCartButton';

// 租赁档位 → 可售 SKU（线上付款）。价格以 seed 的租赁产品为准。
const TIER_SKUS = [
  { code: 'RENT-WEEKEND', price: 99 },
  { code: 'RENT-MONTHLY', price: 199 },
  { code: 'RENT-TO-OWN', price: 299 },
];

export default async function RentalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('pages');
  const tiers = t.raw('rental.tiers') as Array<{ name: string; price: string; desc: string }>;

  return (
    <div className="mx-auto max-w-container px-6 py-16">
      <h1 className="text-3xl font-bold text-brand-dark">{t('rental.title')}</h1>
      <p className="mt-3 max-w-2xl text-gray-600">{t('rental.subtitle')}</p>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {tiers.map((tier, i) => {
          const sku = TIER_SKUS[i];
          return (
            <div key={i} className="flex flex-col rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900">{tier.name}</h2>
              <p className="mt-2 text-2xl font-bold text-brand">{tier.price}</p>
              <p className="mt-3 flex-1 text-sm text-gray-500">{tier.desc}</p>
              {sku && (
                <div className="mt-6">
                  <AddToCartButton skuCode={sku.code} name={tier.name} price={sku.price} block />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-8 text-center text-sm text-gray-500">{t('rental.note')}</p>
    </div>
  );
}
