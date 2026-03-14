import Link from "next/link"

import { MarketingShell } from "../../components/MarketingLayout"
import StructuredData from "../../components/StructuredData"
import { pricingTiers, siteUrl } from "../../lib/content"

export const metadata = {
  title: "Pricing | QRBulkGen",
  description: "Choose the QRBulkGen tier that fits single generation, bulk campaigns, and team visibility needs.",
  alternates: {
    canonical: `${siteUrl}/pricing`,
  },
  openGraph: {
    title: "Pricing | QRBulkGen",
    description: "Choose the QRBulkGen tier that fits single generation, bulk campaigns, and team visibility needs.",
    url: `${siteUrl}/pricing`,
    type: "website",
  },
}

export default function PricingPage() {
  return (
    <MarketingShell>
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          itemListElement: pricingTiers.map((tier, index) => ({
            "@type": "Offer",
            position: index + 1,
            name: tier.name,
            price: tier.price === "Free" ? "0" : tier.price.replace(/[^0-9.]/g, ""),
            priceCurrency: "USD",
          })),
        }}
      />

      <main className="mx-auto flex max-w-6xl flex-col gap-20 px-6 py-16">
        <section className="mx-auto max-w-4xl text-center">
          <p className="inline-flex rounded-full border border-amber-300/70 bg-amber-100/75 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-amber-900">
            Pricing
          </p>
          <h1 className="mt-6 text-5xl font-black tracking-tight text-slate-950">
            Simple pricing for teams moving from quick QR assets to repeatable operations.
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-600">
            Start with single generation, scale into bulk jobs, and keep public scan experiences,
            dashboards, and mobile visibility inside the same product path.
          </p>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          {pricingTiers.map((tier) => (
            <article
              key={tier.name}
              className={`rounded-[2rem] border p-8 shadow-sm ${
                tier.featured
                  ? "border-slate-950 bg-slate-950 text-white shadow-[0_18px_60px_rgba(15,23,42,0.16)]"
                  : "border-slate-200/80 bg-white/90 text-slate-950"
              }`}
            >
              <p
                className={`text-sm font-semibold uppercase tracking-[0.22em] ${
                  tier.featured ? "text-slate-300" : "text-slate-500"
                }`}
              >
                {tier.name}
              </p>
              <div className="mt-4 flex items-end gap-2">
                <p className="text-5xl font-black">{tier.price}</p>
              </div>
              <p className={`mt-3 ${tier.featured ? "text-slate-300" : "text-slate-600"}`}>{tier.billing}</p>
              <p className={`mt-6 leading-7 ${tier.featured ? "text-slate-200" : "text-slate-600"}`}>{tier.summary}</p>
              <ul className={`mt-6 space-y-3 ${tier.featured ? "text-slate-100" : "text-slate-700"}`}>
                {tier.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <Link
                href={tier.ctaHref}
                className={`mt-8 inline-flex rounded-full px-5 py-3 text-sm font-semibold ${
                  tier.featured ? "bg-white text-slate-950" : "bg-slate-950 text-white"
                }`}
              >
                {tier.ctaLabel}
              </Link>
            </article>
          ))}
        </section>

        <section className="grid gap-8 rounded-[2rem] bg-slate-950 px-8 py-10 text-white lg:grid-cols-[1fr_1fr]">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-slate-300">What happens next</p>
            <h2 className="mt-3 text-3xl font-bold">Move from landing page to actual product usage without confusion.</h2>
            <p className="mt-4 leading-7 text-slate-300">
              Every pricing CTA points into signup, login, or generator flows so the product funnel stays
              coherent from first visit to first generated asset.
            </p>
          </div>
          <div className="grid gap-4">
            <Link href="/generate" className="rounded-3xl bg-white/10 px-5 py-5 font-semibold hover:bg-white/20">
              Open generator
            </Link>
            <Link href="/blog" className="rounded-3xl bg-white/10 px-5 py-5 font-semibold hover:bg-white/20">
              Read launch articles
            </Link>
            <Link href="/bulk-qr-codes" className="rounded-3xl bg-white/10 px-5 py-5 font-semibold hover:bg-white/20">
              Explore bulk QR landing page
            </Link>
          </div>
        </section>
      </main>
    </MarketingShell>
  )
}
