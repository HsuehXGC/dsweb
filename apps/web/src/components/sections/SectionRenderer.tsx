import type { Locale } from '@dsweb/types';
import { blockContent, type CmsSection } from '@/lib/cms';
import { CtaButton } from '@/components/CtaButton';

/** 容器：统一最大宽度与间距（设计文档 4.5） */
function Container({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-container px-6">{children}</div>;
}

function bgClass(config: Record<string, unknown>): string {
  const bg = config.bg;
  if (bg === 'brand-light') return 'bg-brand-light';
  if (bg === 'brand-dark') return 'bg-brand text-white';
  return 'bg-white';
}

/** 根据 section.type 分发到对应渲染器 */
export function SectionRenderer({ section, locale }: { section: CmsSection; locale: Locale }) {
  const c = blockContent(section, locale);
  if (!c) return null;
  const wrap = bgClass(section.config);

  switch (section.type) {
    case 'hero':
      return <Hero c={c} wrap={wrap} />;
    case 'three_ways':
      return <ThreeWays c={c} wrap={wrap} />;
    case 'weekly_visit':
      return <WeeklyVisit c={c} wrap={wrap} />;
    case 'how_it_works':
      return <HowItWorks c={c} wrap={wrap} />;
    case 'customer_types':
      return <CustomerTypes c={c} wrap={wrap} />;
    case 'membership':
      return <Membership c={c} wrap={wrap} />;
    case 'testimonials':
      return <Testimonials c={c} wrap={wrap} />;
    case 'service_area':
      return <ServiceArea c={c} wrap={wrap} />;
    case 'final_cta':
      return <FinalCta c={c} wrap={wrap} />;
    default:
      return null;
  }
}

type C = Record<string, any>;

function SectionHead({ title, subtitle, light }: { title: string; subtitle?: string; light?: boolean }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
      {subtitle && (
        <p className={`mt-4 text-lg ${light ? 'text-white/80' : 'text-gray-600'}`}>{subtitle}</p>
      )}
    </div>
  );
}

function Hero({ c, wrap }: { c: C; wrap: string }) {
  return (
    <section className={wrap}>
      <Container>
        <div className="py-20 text-center sm:py-28">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-mid">{c.eyebrow}</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-brand-dark sm:text-6xl">
            {c.title}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-700">{c.subtitle}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <CtaButton href="/book">{c.primaryCta}</CtaButton>
            <CtaButton href="#how_it_works" variant="secondary">
              {c.secondaryCta}
            </CtaButton>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-500">
            {(c.badges as string[]).map((b) => (
              <span key={b} className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-mid" />
                {b}
              </span>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

function ThreeWays({ c, wrap }: { c: C; wrap: string }) {
  return (
    <section className={wrap}>
      <Container>
        <div className="py-16">
          <SectionHead title={c.title} subtitle={c.subtitle} />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {(c.cards as C[]).map((card) => (
              <div
                key={card.title}
                className={`relative flex flex-col rounded-xl border p-6 transition-all hover:-translate-y-1 ${
                  card.recommended ? 'border-brand-gold shadow-md' : 'border-gray-200'
                }`}
              >
                {card.recommended && (
                  <span className="absolute -top-3 left-6 rounded-full bg-brand-gold px-3 py-1 text-xs font-semibold text-white">
                    ★ Recommended
                  </span>
                )}
                <h3 className="text-xl font-semibold text-gray-900">{card.title}</h3>
                <p className="mt-3 flex-1 text-gray-600">{card.desc}</p>
                <p className="mt-4 text-sm text-gray-500">{card.points}</p>
                <div className="mt-6">
                  <CtaButton href="/book" variant={card.recommended ? 'primary' : 'secondary'}>
                    {card.cta}
                  </CtaButton>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

function WeeklyVisit({ c, wrap }: { c: C; wrap: string }) {
  const demo = c.demoDay as C;
  const routes = c.routes as C;
  return (
    <section className={wrap}>
      <Container>
        <div className="py-16">
          <SectionHead title={c.title} subtitle={c.subtitle} />
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {/* Burlington 体验日 */}
            <div className="rounded-xl bg-brand p-8 text-white">
              <h3 className="text-xl font-semibold">{demo.title}</h3>
              <p className="mt-2 font-medium text-brand-gold">{demo.time}</p>
              <p className="mt-4 text-white/85">{demo.invite}</p>
              <p className="mt-3 text-sm text-white/70">{demo.note}</p>
              <div className="mt-6">
                <CtaButton href="/book" variant="ghost">
                  {demo.cta} →
                </CtaButton>
              </div>
            </div>
            {/* 本周安装路线 */}
            <div className="rounded-xl bg-brand-light p-8">
              <h3 className="text-xl font-semibold text-brand-dark">{routes.title}</h3>
              <p className="mt-2 text-gray-600">{routes.subtitle}</p>
              <ul className="mt-5 divide-y divide-brand/10">
                {(routes.towns as C[]).map((t) => (
                  <li key={t.town} className="flex items-center justify-between py-3">
                    <span className="font-medium text-brand-dark">
                      {t.day} · {t.town}
                    </span>
                    <a href="/book" className="text-sm font-medium text-brand-mid hover:underline">
                      {routes.townCta} →
                    </a>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm text-gray-500">{routes.fallback} →</p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

function HowItWorks({ c, wrap }: { c: C; wrap: string }) {
  return (
    <section id="how_it_works" className={wrap}>
      <Container>
        <div className="py-16">
          <SectionHead title={c.title} subtitle={c.subtitle} />
          <div className="mt-12 grid gap-8 md:grid-cols-4">
            {(c.steps as C[]).map((step, i) => (
              <div key={step.title} className="text-center md:text-left">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-2 border-brand text-lg font-bold text-brand md:mx-0">
                  {i + 1}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">{step.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{step.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <CtaButton href="/book">{c.cta} →</CtaButton>
          </div>
        </div>
      </Container>
    </section>
  );
}

function CustomerTypes({ c, wrap }: { c: C; wrap: string }) {
  return (
    <section className={wrap}>
      <Container>
        <div className="py-16">
          <SectionHead title={c.title} subtitle={c.subtitle} />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {(c.cards as C[]).map((card) => (
              <div key={card.title} className="rounded-xl border border-gray-200 p-6">
                <h3 className="text-xl font-semibold text-gray-900">{card.title}</h3>
                <p className="mt-1 text-sm font-medium text-brand-mid">{card.area}</p>
                <ul className="mt-4 space-y-2">
                  {(card.pains as string[]).map((p) => (
                    <li key={p} className="flex gap-2 text-gray-600">
                      <span className="text-brand-mid">✓</span>
                      {p}
                    </li>
                  ))}
                </ul>
                <a
                  href="/book"
                  className="mt-5 inline-block text-sm font-medium text-brand-mid hover:underline"
                >
                  {card.cta} →
                </a>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

function Membership({ c, wrap }: { c: C; wrap: string }) {
  return (
    <section className={wrap}>
      <Container>
        <div className="grid items-center gap-10 py-16 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-semibold sm:text-4xl">{c.title}</h2>
            <p className="mt-4 text-white/80">{c.subtitle}</p>
            <ul className="mt-6 space-y-3">
              {(c.benefits as string[]).map((b) => (
                <li key={b} className="flex gap-2">
                  <span className="text-brand-gold">✓</span>
                  {b}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <CtaButton href="/membership" variant="ghost">
                {c.cta} →
              </CtaButton>
            </div>
          </div>
          <div className="rounded-2xl bg-white/10 p-10 text-center">
            <div className="flex items-end justify-center">
              <span className="text-6xl font-bold">{c.price}</span>
              <span className="mb-2 ml-1 text-white/70">{c.priceUnit}</span>
            </div>
            <p className="mt-3 text-sm text-white/70">{c.priceNote}</p>
          </div>
        </div>
      </Container>
    </section>
  );
}

function Testimonials({ c, wrap }: { c: C; wrap: string }) {
  const fp = c.founderPromise as C;
  return (
    <section className={wrap}>
      <Container>
        <div className="py-16">
          <SectionHead title={c.title} subtitle={c.subtitle} />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {(c.reviews as C[]).map((r) => (
              <figure key={r.author} className="rounded-xl border border-gray-200 p-6">
                <blockquote className="italic text-gray-700">“{r.body}”</blockquote>
                <figcaption className="mt-4 text-sm font-medium text-gray-500">
                  — {r.author}
                </figcaption>
              </figure>
            ))}
          </div>
          <div className="mx-auto mt-10 max-w-3xl rounded-xl bg-brand-light p-8 text-center">
            <h3 className="text-lg font-semibold text-brand-dark">{fp.title}</h3>
            <p className="mt-3 italic text-gray-700">{fp.body}</p>
            <p className="mt-4 text-sm font-medium text-gray-500">{fp.signature}</p>
          </div>
        </div>
      </Container>
    </section>
  );
}

function ServiceArea({ c, wrap }: { c: C; wrap: string }) {
  return (
    <section className={wrap}>
      <Container>
        <div className="py-16">
          <SectionHead title={c.title} subtitle={c.subtitle} />
          <p className="mt-8 text-center text-gray-600">{c.mapNote}</p>
          <div className="mx-auto mt-6 flex max-w-3xl flex-wrap justify-center gap-2">
            {(c.towns as string[]).map((t) => (
              <span
                key={t}
                className="rounded-full border border-brand/20 bg-white px-3 py-1 text-sm text-brand-dark"
              >
                {t}
              </span>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-gray-500">{c.edgeNote}</p>
          <div className="mt-8 text-center">
            <CtaButton href="/book" variant="secondary">
              {c.cta} →
            </CtaButton>
          </div>
        </div>
      </Container>
    </section>
  );
}

function FinalCta({ c, wrap }: { c: C; wrap: string }) {
  return (
    <section className={wrap}>
      <Container>
        <div className="py-20 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">{c.title}</h2>
          <p className="mx-auto mt-4 max-w-xl text-white/80">{c.subtitle}</p>
          <div className="mt-8">
            <CtaButton href="/book" variant="ghost">
              {c.cta}
            </CtaButton>
          </div>
        </div>
      </Container>
    </section>
  );
}
