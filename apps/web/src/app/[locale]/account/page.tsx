import { setRequestLocale } from 'next-intl/server';
import { AccountClient } from '@/components/AccountClient';

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="bg-brand-light">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <AccountClient />
      </div>
    </div>
  );
}
