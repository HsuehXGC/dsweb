import { Link } from '@/i18n/navigation';

type Variant = 'primary' | 'secondary' | 'ghost';

const styles: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-dark shadow-sm hover:-translate-y-0.5',
  secondary: 'bg-white text-brand border border-brand hover:bg-brand-light',
  ghost: 'bg-transparent text-white border border-white hover:bg-white hover:text-brand',
};

export function CtaButton({
  href,
  children,
  variant = 'primary',
}: {
  href: string;
  children: React.ReactNode;
  variant?: Variant;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-[44px] items-center justify-center rounded-md px-8 py-3 text-base font-medium transition-all ${styles[variant]}`}
    >
      {children}
    </Link>
  );
}
