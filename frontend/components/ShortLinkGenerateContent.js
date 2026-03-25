"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { apiRequest } from "../lib/api"
import { getAuthToken } from "../lib/auth"
import { downloadCsv, parseCsv } from "../lib/csv"

export default function ShortLinkGenerateContent({ mode = "single" }) {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [targetUrl, setTargetUrl] = useState("")
  const [slug, setSlug] = useState("")
  const [expiresAt, setExpiresAt] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [bulkRows, setBulkRows] = useState([])

  const previewRows = useMemo(() => bulkRows.slice(0, 6), [bulkRows])

  async function createShortLink(payload) {
    const token = getAuthToken()
    if (!token) {
      router.replace("/login")
      return null
    }

    return apiRequest("/short-links", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    })
  }

  async function handleSingleSubmit(event) {
    event.preventDefault()
    setError("")
    setMessage("")
    setIsSubmitting(true)

    try {
      await createShortLink({ title, targetUrl, slug, expiresAt })
      setMessage("Short URL created successfully.")
      setTitle("")
      setTargetUrl("")
      setSlug("")
      setExpiresAt("")
    } catch (requestError) {
      setError(requestError.message || "Unable to create short URL.")
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleBulkCsvChange(event) {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        setBulkRows(parseCsv(String(reader.result || "")))
        setError("")
      } catch {
        setBulkRows([])
        setError("Unable to read this CSV file.")
      }
    }
    reader.readAsText(file)
  }

  async function handleBulkCreate() {
    if (!bulkRows.length) {
      setError("Upload a CSV before creating bulk short URLs.")
      return
    }

    setError("")
    setMessage("")
    setIsSubmitting(true)

    try {
      for (const row of bulkRows) {
        await createShortLink({
          title: row.title || "",
          targetUrl: row.targetUrl || row.url || "",
          slug: row.slug || "",
          expiresAt: row.expiresAt || "",
        })
      }
      setMessage(`Created ${bulkRows.length} short URLs.`)
    } catch (requestError) {
      setError(requestError.message || "Unable to create bulk short URLs.")
    } finally {
      setIsSubmitting(false)
    }
  }

  function downloadSampleCsv() {
    downloadCsv(
      "short-links-bulk-sample.csv",
      ["title", "targetUrl", "slug", "expiresAt"],
      [
        {
          title: "Campaign Landing Page",
          targetUrl: "https://example.com/launch",
          slug: "launch2026",
          expiresAt: "31-12-2026",
        },
      ],
    )
  }

  if (mode === "bulk") {
    return (
      <main className="mx-auto max-w-[90rem] px-4 py-10 md:px-5">
        <h1 className="text-3xl font-bold">Bulk Short URL Upload</h1>
        <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">CSV upload</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">Create short URLs in bulk</h2>
              <p className="mt-1 text-sm text-slate-500">
                Upload rows with title, target URL, optional slug, and optional expiry date.
              </p>
            </div>
            <input type="file" accept=".csv" onChange={handleBulkCsvChange} className="w-full border p-2" />
            <button type="button" onClick={downloadSampleCsv} className="rounded-xl border px-4 py-3 text-sm font-semibold text-slate-900">
              Download Sample CSV
            </button>
            <button
              type="button"
              onClick={handleBulkCreate}
              disabled={isSubmitting || !bulkRows.length}
              className="rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isSubmitting ? "Creating..." : "Create Bulk Short URLs"}
            </button>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Preview rows</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">Bulk short URL preview</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
                {bulkRows.length} rows
              </span>
            </div>

            {!previewRows.length ? (
              <p className="mt-6 text-sm text-slate-500">Upload a CSV to preview rows here.</p>
            ) : (
              <div className="mt-6 grid gap-3">
                {previewRows.map((row, index) => (
                  <div key={`${row.slug || row.targetUrl || "short"}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="font-semibold text-slate-900">{row.title || `Short URL ${index + 1}`}</p>
                    <p className="mt-1 break-all text-sm text-slate-600">{row.targetUrl || row.url || "-"}</p>
                    <p className="mt-2 text-xs text-slate-500">Slug: {row.slug || "auto-generate"}</p>
                  </div>
                ))}
              </div>
            )}
            {message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}
            {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-[90rem] px-4 py-10 md:px-5">
      <h1 className="text-3xl font-bold">Short URL Generator</h1>
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,0.95fr)_minmax(0,0.85fr)_auto] xl:items-end" onSubmit={handleSingleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Title</label>
            <input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Target URL</label>
            <input value={targetUrl} onChange={(event) => setTargetUrl(event.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Custom slug</label>
            <input value={slug} onChange={(event) => setSlug(event.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Expiry</label>
            <input value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3" placeholder="DD-MM-YYYY" />
          </div>
          <button disabled={isSubmitting} className="rounded-xl bg-slate-950 px-4 py-3 font-semibold text-white disabled:opacity-60">
            {isSubmitting ? "Creating..." : "Create Short URL"}
          </button>
        </form>
        {message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
      </section>
    </main>
  )
}
