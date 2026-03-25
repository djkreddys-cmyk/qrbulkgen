import SeoLandingPage from "../../components/SeoLandingPage"
import { getLandingPage, siteUrl } from "../../lib/content"

const page = getLandingPage("create-qr-codes-from-csv")

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

export default function CreateQrCodesFromCsvPage() {
  return <SeoLandingPage page={page} />
}
