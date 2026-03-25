import { blogPosts, landingPages, siteUrl } from "../lib/content"

export default function sitemap() {
  const staticRoutes = [
    "",
    "/pricing",
    "/blog",
    "/generate",
    "/use-cases",
    "/barcode-generator",
    "/bulk-qr-codes",
    "/bulk-barcode-generator",
    "/bulk-qr-codes-for-inventory",
    "/label-generator",
    "/qr-code-generator-for-labels",
    "/create-qr-codes-from-csv",
    "/print-multiple-qr-codes-on-one-page",
    "/private-qr-code-generator",
    "/product-label-generator",
    "/qr-codes-for-product-packaging",
    "/qr-codes-for-classrooms",
    "/qr-codes-for-restaurant-tables",
    "/single-qr-codes",
    "/qr-codes-for-marketing",
    "/qr-codes-for-events",
    "/qr-codes-for-inventory-packaging",
  ]

  const pages = staticRoutes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.7,
  }))

  const postRoutes = blogPosts.map((post) => ({
    url: `${siteUrl}/blog/${post.slug}`,
    lastModified: new Date("2026-03-25T10:00:00Z"),
    changeFrequency: "monthly",
    priority: 0.8,
  }))

  const landingRoutes = landingPages.map((page) => ({
    url: `${siteUrl}${page.href}`,
    lastModified: new Date("2026-03-24T10:00:00Z"),
    changeFrequency: "monthly",
    priority: 0.85,
  }))

  return [...pages, ...postRoutes, ...landingRoutes]
}
