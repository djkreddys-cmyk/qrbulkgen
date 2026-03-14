import Link from "next/link"

import { MarketingShell } from "../../components/MarketingLayout"
import { blogPosts, siteUrl } from "../../lib/content"

export const metadata = {
  title: "Blog | QRBulkGen",
  description: "Launch-ready QR strategy articles for bulk generation, events, marketing, packaging, and feedback workflows.",
  alternates: {
    canonical: `${siteUrl}/blog`,
  },
}

export default function Blog() {
  return (
    <MarketingShell>
      <main className="mx-auto flex max-w-6xl flex-col gap-14 px-6 py-16">
        <section className="max-w-4xl">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Blog</p>
          <h1 className="mt-3 text-5xl font-black tracking-tight text-slate-950">
            Articles built to support launch, SEO, and real product evaluation.
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-600">
            These articles connect product use cases, landing pages, and pricing decisions so organic
            visitors can understand both strategy and workflow.
          </p>
        </section>

        <section className="grid gap-6">
          {blogPosts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex flex-wrap gap-3 text-sm text-slate-500">
                <span>{post.category}</span>
                <span>{post.date}</span>
                <span>{post.readTime}</span>
              </div>
              <h2 className="mt-4 text-3xl font-bold text-slate-950">{post.title}</h2>
              <p className="mt-4 max-w-3xl leading-7 text-slate-600">{post.description}</p>
              <p className="mt-6 text-sm font-semibold text-slate-950">Read article</p>
            </Link>
          ))}
        </section>
      </main>
    </MarketingShell>
  )
}
