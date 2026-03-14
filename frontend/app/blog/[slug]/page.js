import Link from "next/link"
import { notFound } from "next/navigation"

import { MarketingShell } from "../../../components/MarketingLayout"
import StructuredData from "../../../components/StructuredData"
import { blogPosts, getBlogPost, siteUrl } from "../../../lib/content"

export async function generateStaticParams() {
  return blogPosts.map((post) => ({
    slug: post.slug,
  }))
}

export async function generateMetadata({ params }) {
  const resolved = await params
  const post = getBlogPost(resolved.slug)
  if (!post) {
    return {}
  }

  return {
    title: `${post.title} | QRBulkGen Blog`,
    description: post.description,
    alternates: {
      canonical: `${siteUrl}/blog/${post.slug}`,
    },
    openGraph: {
      title: `${post.title} | QRBulkGen Blog`,
      description: post.description,
      url: `${siteUrl}/blog/${post.slug}`,
      type: "article",
    },
  }
}

export default async function BlogPost({ params }) {
  const resolved = await params
  const post = getBlogPost(resolved.slug)

  if (!post) {
    notFound()
  }

  return (
    <MarketingShell>
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          description: post.description,
          datePublished: post.date,
          author: {
            "@type": "Organization",
            name: "QRBulkGen",
          },
          publisher: {
            "@type": "Organization",
            name: "QRBulkGen",
          },
        }}
      />

      <main className="mx-auto flex max-w-4xl flex-col gap-12 px-6 py-16">
        <article className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-8 shadow-sm">
          <div className="flex flex-wrap gap-3 text-sm text-slate-500">
            <span>{post.category}</span>
            <span>{post.date}</span>
            <span>{post.readTime}</span>
          </div>

          <h1 className="mt-5 text-5xl font-black tracking-tight text-slate-950">{post.title}</h1>
          <p className="mt-6 text-lg leading-8 text-slate-600">{post.description}</p>

          <div className="mt-10 space-y-10">
            {post.sections.map((section) => (
              <section key={section.heading} className="space-y-5">
                <h2 className="text-2xl font-bold text-slate-950">{section.heading}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="leading-8 text-slate-700">
                    {paragraph}
                  </p>
                ))}
                {section.bullets?.length ? (
                  <ul className="list-disc space-y-3 pl-6 text-slate-700">
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>
        </article>

        <section className="rounded-[2rem] bg-slate-950 px-8 py-8 text-white">
          <p className="text-sm uppercase tracking-[0.22em] text-slate-300">Next step</p>
          <h2 className="mt-3 text-3xl font-bold">Go from article to actual workflow.</h2>
          <p className="mt-4 max-w-2xl text-slate-300">
            Explore the related landing page, review pricing, or jump into the generator to test the
            workflow against your own campaign or operations use case.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={post.relatedLandingHref} className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950">
              View related landing page
            </Link>
            <Link href="/pricing" className="rounded-full bg-white/15 px-5 py-3 text-sm font-semibold text-white">
              View pricing
            </Link>
            <Link href="/generate" className="rounded-full bg-white/15 px-5 py-3 text-sm font-semibold text-white">
              Open generator
            </Link>
          </div>
        </section>
      </main>
    </MarketingShell>
  )
}
