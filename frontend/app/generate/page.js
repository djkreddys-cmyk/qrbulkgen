"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Navbar from "../../components/Navbar"
import BarcodeGenerateContent from "../../components/BarcodeGenerateContent"
import LabelGenerateContent from "../../components/LabelGenerateContent"
import { SingleGenerateContent } from "./single/page"
import { BulkGenerateContent } from "../upload/page"
import { isAuthenticated } from "../../lib/auth"

export default function GeneratePage() {
  const router = useRouter()
  const [mode, setMode] = useState("single")
  const [isCheckingSession, setIsCheckingSession] = useState(true)

  function handleModeChange(nextMode) {
    setMode(nextMode)
    router.replace(`/generate?mode=${nextMode}`)
  }

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login")
      return
    }

    const params = new URLSearchParams(window.location.search)
    const queryMode = params.get("mode")
    if (["bulk", "single", "barcode", "labels"].includes(queryMode)) {
      setMode(queryMode)
    }
    setIsCheckingSession(false)
  }, [router])

  if (isCheckingSession) {
    return null
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-[90rem] px-5 pt-8 md:px-6 xl:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex overflow-hidden rounded-2xl border border-slate-900 shadow-sm">
              <button
                type="button"
                onClick={() => handleModeChange("single")}
                className={`px-5 py-2.5 text-sm font-semibold transition ${mode === "single" ? "bg-slate-950 text-white" : "text-slate-900 hover:bg-slate-50"}`}
              >
                Single
              </button>
              <button
                type="button"
                onClick={() => handleModeChange("bulk")}
                className={`border-l border-slate-900 px-5 py-2.5 text-sm font-semibold transition ${mode === "bulk" ? "bg-slate-950 text-white" : "text-slate-900 hover:bg-slate-50"}`}
              >
                Bulk
              </button>
              <button
                type="button"
                onClick={() => handleModeChange("barcode")}
                className={`border-l border-slate-900 px-5 py-2.5 text-sm font-semibold transition ${mode === "barcode" ? "bg-slate-950 text-white" : "text-slate-900 hover:bg-slate-50"}`}
              >
                Barcode
              </button>
              <button
                type="button"
                onClick={() => handleModeChange("labels")}
                className={`border-l border-slate-900 px-5 py-2.5 text-sm font-semibold transition ${mode === "labels" ? "bg-slate-950 text-white" : "text-slate-900 hover:bg-slate-50"}`}
              >
                Labels
              </button>
            </div>
            <div className="hidden h-10 w-24 rounded-2xl bg-gradient-to-r from-slate-100 via-white to-slate-100 md:block" />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex overflow-hidden rounded-2xl border border-slate-900 shadow-sm">
              <Link
                href="/short-links"
                className="inline-flex items-center justify-center bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Short URL
              </Link>
            </div>
          </div>
        </div>
      </main>

      {mode === "single" ? <SingleGenerateContent embedded /> : null}
      {mode === "bulk" ? <BulkGenerateContent embedded /> : null}
      {mode === "barcode" ? <BarcodeGenerateContent /> : null}
      {mode === "labels" ? <LabelGenerateContent /> : null}
    </div>
  )
}
