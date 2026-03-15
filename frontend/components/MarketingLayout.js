import Link from "next/link"

import Navbar from "./Navbar"

export function MarketingShell({ children }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff9ed_0%,#f6f7fb_42%,#eef2ff_100%)] text-slate-950">
      <Navbar />
      {children}
      <footer className="border-t border-slate-200/70 bg-white/80">
        <div className="mx-auto flex max-w-[88rem] flex-col gap-6 px-4 py-10 text-sm text-slate-600 md:px-6 md:flex-row md:items-center md:justify-between xl:px-8">
          <div>
            <p className="text-base font-semibold text-slate-950">QRBulkGen</p>
            <p>Bulk and single QR workflows for teams, campaigns, events, and packaging operations.</p>
          </div>
          <div className="flex flex-wrap gap-5">
            <Link href="/generate" className="hover:text-slate-950">Generate</Link>
            <Link href="/pricing" className="hover:text-slate-950">Pricing</Link>
            <Link href="/#insights" className="hover:text-slate-950">Insights</Link>
            <Link href="/bulk-qr-codes" className="hover:text-slate-950">Bulk QR</Link>
            <Link href="/single-qr-codes" className="hover:text-slate-950">Single QR</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

export function HeroCtaRow() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Link
        href="/login"
        className="rounded-full bg-slate-950 px-6 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        Open Generator
      </Link>
      <Link
        href="/login"
        className="rounded-full border border-slate-300 bg-white px-6 py-3 text-center text-sm font-semibold text-slate-900 transition hover:border-slate-950"
      >
        Create Account
      </Link>
    </div>
  )
}
