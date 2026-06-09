'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { cart } from '@/lib/cart';

export function AddToCartButton({
  skuCode,
  name,
  price,
  block,
}: {
  skuCode: string;
  name: string;
  price: number;
  block?: boolean;
}) {
  const t = useTranslations('shop');
  const [added, setAdded] = useState(false);

  const onClick = () => {
    cart.add({ sku_code: skuCode, name, price });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <button
      onClick={onClick}
      className={`rounded-md bg-brand px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-dark ${
        block ? 'w-full' : ''
      }`}
    >
      {added ? `✓ ${t('added')}` : t('addToCart')}
    </button>
  );
}
