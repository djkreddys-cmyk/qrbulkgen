import SeoLandingPage from "../../components/SeoLandingPage"
import { getLandingPage, siteUrl } from "../../lib/content"

const page = getLandingPage("product-label-generator")

export const metadata = {
  title: `${page.title} | QRBulkGen`,
  description: page.description,
  alternates: { canonical: `${siteUrl}${page.href}` },
  openGraph: {
    title: `${page.title} | QRBulkGen`,
    description: page.description,
    url: `${siteUrl}${page.href}`,
    type: "website",
  },
}

export default function ProductLabelGeneratorPage() {
  return <SeoLandingPage page={page} />
}
