"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Navbar from "../../components/Navbar"
import BarcodeGenerateContent from "../../components/BarcodeGenerateContent"
import LabelGenerateContent from "../../components/LabelGenerateContent"
import ShortLinkGenerateContent from "../../components/ShortLinkGenerateContent"
import { SingleGenerateContent } from "./single/page"
import { BulkGenerateContent } from "../upload/page"
import { isAuthenticated } from "../../lib/auth"

export default function GeneratePage() {
  const router = useRouter()
  const [generatorType, setGeneratorType] = useState("qr")
  const [mode, setMode] = useState("single")
  const [isCheckingSession, setIsCheckingSession] = useState(true)

  function handleModeChange(nextMode, nextType = generatorType) {
    setGeneratorType(nextType)
    setMode(nextMode)
    router.replace(`/generate?type=${nextType}&mode=${nextMode}`)
  }

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login")
      return
    }

    const params = new URLSearchParams(window.location.search)
    const queryMode = params.get("mode")
    const queryType = params.get("type")
    if (["qr", "short-url", "barcode", "label"].includes(queryType)) {
      setGeneratorType(queryType)
    }
    if (["bulk", "single"].includes(queryMode)) {
      setMode(queryMode)
    }
    setIsCheckingSession(false)
  }, [router])

  if (isCheckingSession) {
    return null
  }

  const typeOptions = [
    { value: "qr", label: "QR Code" },
    { value: "short-url", label: "Short URL" },
    { value: "barcode", label: "Barcode" },
    { value: "label", label: "Label Printing" },
  ]

  const currentTypeLabel = typeOptions.find((option) => option.value === generatorType)?.label || "QR Code"

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-[90rem] px-5 pt-8 md:px-6 xl:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={generatorType}
              onChange={(event) => handleModeChange("single", event.target.value)}
              className="rounded-2xl border border-slate-900 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm"
            >
              {typeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
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
            </div>
            <div className="hidden h-10 w-24 rounded-2xl bg-gradient-to-r from-slate-100 via-white to-slate-100 md:block" />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
              {currentTypeLabel}
            </span>
          </div>
        </div>
      </main>

      {generatorType === "qr" && mode === "single" ? <SingleGenerateContent embedded /> : null}
      {generatorType === "qr" && mode === "bulk" ? <BulkGenerateContent embedded /> : null}
      {generatorType === "short-url" ? <ShortLinkGenerateContent mode={mode} /> : null}
      {generatorType === "barcode" ? <BarcodeGenerateContent mode={mode} /> : null}
      {generatorType === "label" ? <LabelGenerateContent mode={mode} /> : null}
    </div>
  )
}
