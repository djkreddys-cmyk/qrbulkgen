import HomePageClient from "../components/HomePageClient"
import HomeRedirectGuard from "../components/HomeRedirectGuard"
import { MarketingShell } from "../components/MarketingLayout"
import StructuredData from "../components/StructuredData"
import { pricingTiers, siteUrl } from "../lib/content"

export const metadata = {
  title: "QRBulkGen | QR Code, Short URL, Blog, and Generator for Teams",
  description:
    "Explore QR code and Short URL guides for bulk generation, campaigns, events, packaging, ratings, feedback, and analytics, then launch both workflows from one platform.",
  alternates: {
    canonical: siteUrl,
  },
}

export default function Home() {
  return (
    <MarketingShell>
      <HomeRedirectGuard />
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "QRBulkGen",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web, Android",
          offers: pricingTiers.map((tier) => ({
            "@type": "Offer",
            name: tier.name,
            price: tier.price === "Free" ? "0" : tier.price.replace(/[^0-9.]/g, ""),
            priceCurrency: "USD",
          })),
        }}
      />
      <HomePageClient />
    </MarketingShell>
  )
}
