import { Manrope, Space_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";

import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata = {
  metadataBase: new URL("https://www.qrbulkgen.com"),
  title: {
    default: "QRBulkGen | Bulk and Single QR Code Workflows",
    template: "%s",
  },
  description:
    "Generate single and bulk QR codes, monitor jobs, launch feedback flows, and ship campaign-ready assets from one platform.",
  openGraph: {
    title: "QRBulkGen | Bulk and Single QR Code Workflows",
    description:
      "Generate single and bulk QR codes, monitor jobs, and ship campaign-ready assets from one platform.",
    url: "https://www.qrbulkgen.com",
    siteName: "QRBulkGen",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "QRBulkGen | Bulk and Single QR Code Workflows",
    description:
      "Generate single and bulk QR codes, monitor jobs, and ship campaign-ready assets from one platform.",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${spaceGrotesk.variable}`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
