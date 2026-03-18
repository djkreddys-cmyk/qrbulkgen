"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import Navbar from "../../components/Navbar"
import { apiRequest } from "../../lib/api"
import { clearAuthSession, getAuthToken } from "../../lib/auth"

function formatDate(value) {
  if (!value) return "Not set"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "Not set"
  return parsed.toLocaleString()
}

function isExpiredLink(link) {
  if (!link?.expiresAt) return false
  const parsed = new Date(link.expiresAt)
  return !Number.isNaN(parsed.getTime()) && parsed.getTime() < Date.now()
}

function isExpiringSoonLink(link) {
  if (!link?.expiresAt) return false
  const parsed = new Date(link.expiresAt)
  if (Number.isNaN(parsed.getTime())) return false
  const diff = parsed.getTime() - Date.now()
  return diff >= 0 && diff <= 1000 * 60 * 60 * 24 * 7
}

function AnalyticsCard({ label, value, tone = "default", helper = "" }) {
  const toneClass =
    tone === "success"
      ? "text-emerald-600"
      : tone === "danger"
        ? "text-rose-600"
        : tone === "accent"
          ? "text-sky-700"
          : "text-slate-950"

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value}</p>
      {helper ? <p className="mt-2 text-xs leading-5 text-slate-500">{helper}</p> : null}
    </div>
  )
}

function ProgressRow({ label, value, total, colorClass = "bg-sky-500", helper = "" }) {
  const percent = total ? Math.max(Math.round((value / total) * 100), value > 0 ? 4 : 0) : 0

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-slate-500">
          {value}
          {helper ? ` - ${helper}` : ""}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

function Sparkline({ points }) {
  if (!points.length) {
    return <p className="text-xs text-slate-400">No visit trend recorded yet.</p>
  }

  const width = 180
  const height = 42
  const max = Math.max(...points.map((point) => point.count), 1)
  const step = points.length === 1 ? width : width / (points.length - 1)
  const path = points
    .map((point, index) => {
      const x = Math.round(index * step)
      const y = Math.round(height - (point.count / max) * (height - 8) - 4)
      return `${index === 0 ? "M" : "L"} ${x} ${y}`
    })
    .join(" ")

  return (
    <div className="space-y-2">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-12 w-full overflow-visible">
        <path d={path} fill="none" stroke="currentColor" strokeWidth="3" className="text-sky-500" strokeLinecap="round" />
      </svg>
      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
        <span>{points[0]?.label || ""}</span>
        <span>{points[points.length - 1]?.label || ""}</span>
      </div>
    </div>
  )
}

export default function ShortLinksPage() {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [targetUrl, setTargetUrl] = useState("")
  const [slug, setSlug] = useState("")
  const [expiresAt, setExpiresAt] = useState("")
  const [links, setLinks] = useState([])
  const [createdLink, setCreatedLink] = useState(null)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [busyLinkId, setBusyLinkId] = useState("")
  const [filters, setFilters] = useState({ status: "active", activity: "all", startDate: "", endDate: "" })
  const [selectedLinkIds, setSelectedLinkIds] = useState([])
  const [analysisLinkId, setAnalysisLinkId] = useState("")
  const [analysisLoadingId, setAnalysisLoadingId] = useState("")
  const [analysisById, setAnalysisById] = useState({})

  const filteredLinks = useMemo(() => {
    return links.filter((link) => {
      const archived = Boolean(link.archivedAt)
      const expired = isExpiredLink(link)
      const createdAt = link.createdAt ? new Date(link.createdAt) : null

      if (filters.status === "active" && archived) return false
      if (filters.status === "archived" && !archived) return false
      if (filters.status === "expired" && !expired) return false
      if (filters.status === "expiring" && !isExpiringSoonLink(link)) return false

      if (filters.activity === "clicked" && Number(link.clickCount || 0) <= 0) return false
      if (filters.activity === "unclicked" && Number(link.clickCount || 0) > 0) return false

      if (filters.startDate && createdAt && !Number.isNaN(createdAt.getTime())) {
        const start = new Date(`${filters.startDate}T00:00:00`)
        if (createdAt < start) return false
      }

      if (filters.endDate && createdAt && !Number.isNaN(createdAt.getTime())) {
        const end = new Date(`${filters.endDate}T23:59:59.999`)
        if (createdAt > end) return false
      }

      return true
    })
  }, [filters, links])

  const selectedLinks = useMemo(() => links.filter((link) => selectedLinkIds.includes(link.id)), [links, selectedLinkIds])
  const activeSelectedCount = selectedLinks.filter((link) => !link.archivedAt).length
  const archivedSelectedCount = selectedLinks.filter((link) => link.archivedAt).length
  const allFilteredSelected = filteredLinks.length > 0 && filteredLinks.every((link) => selectedLinkIds.includes(link.id))

  async function loadLinks() {
    const token = getAuthToken()
    if (!token) {
      router.replace("/login")
      return
    }

    try {
      const data = await apiRequest("/short-links?includeArchived=true", {
        headers: { Authorization: `Bearer ${token}` },
      })
      setLinks(data.links || [])
      setError("")
    } catch (requestError) {
      if (requestError?.status === 401) {
        clearAuthSession()
        router.replace("/login")
        return
      }
      setError(requestError.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadLinks()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setSelectedLinkIds((prev) => prev.filter((id) => links.some((link) => link.id === id)))
  }, [links])

  async function handleCreate(event) {
    event.preventDefault()
    setError("")
    setMessage("")
    setCreatedLink(null)
    setIsSubmitting(true)

    try {
      const token = getAuthToken()
      if (!token) {
        router.replace("/login")
        return
      }

      const data = await apiRequest("/short-links", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title,
          targetUrl,
          slug,
          expiresAt,
        }),
      })

      setCreatedLink(data.link)
      setMessage("Short link created successfully.")
      setTitle("")
      setTargetUrl("")
      setSlug("")
      setExpiresAt("")
      await loadLinks()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(link) {
    const token = getAuthToken()
    if (!token) {
      router.replace("/login")
      return
    }

    const force = Boolean(link.archivedAt)
    const confirmed = window.confirm(
      force
        ? "Permanently delete this short link?"
        : "Archive this short link? You can still review it later.",
    )
    if (!confirmed) return

    try {
      setBusyLinkId(link.id)
      await apiRequest(`/short-links/${link.id}${force ? "?force=true" : ""}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      setSelectedLinkIds((prev) => prev.filter((id) => id !== link.id))
      await loadLinks()
      setMessage(force ? "Short link deleted permanently." : "Short link archived.")
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusyLinkId("")
    }
  }

  async function copyLink(url) {
    try {
      await navigator.clipboard.writeText(url)
      setMessage("Short link copied.")
      setError("")
    } catch {
      setError("Unable to copy short link.")
    }
  }

  function toggleSelectedLink(linkId) {
    setSelectedLinkIds((prev) => (prev.includes(linkId) ? prev.filter((id) => id !== linkId) : [...prev, linkId]))
  }

  function toggleSelectAllFiltered() {
    if (allFilteredSelected) {
      setSelectedLinkIds((prev) => prev.filter((id) => !filteredLinks.some((link) => link.id === id)))
      return
    }

    setSelectedLinkIds((prev) => Array.from(new Set([...prev, ...filteredLinks.map((link) => link.id)])))
  }

  async function handleBulkArchive() {
    const activeSelected = selectedLinks.filter((link) => !link.archivedAt)
    if (!activeSelected.length) {
      setError("Select at least one active short link to archive.")
      return
    }

    const confirmed = window.confirm(`Archive ${activeSelected.length} selected short link${activeSelected.length === 1 ? "" : "s"}?`)
    if (!confirmed) return

    try {
      setBusyLinkId("bulk-archive")
      const token = getAuthToken()
      if (!token) {
        router.replace("/login")
        return
      }

      for (const link of activeSelected) {
        await apiRequest(`/short-links/${link.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        })
      }

      setSelectedLinkIds((prev) => prev.filter((id) => !activeSelected.some((link) => link.id === id)))
      await loadLinks()
      setMessage(`Archived ${activeSelected.length} short link${activeSelected.length === 1 ? "" : "s"}.`)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusyLinkId("")
    }
  }

  async function handleBulkDelete() {
    const archivedSelected = selectedLinks.filter((link) => link.archivedAt)
    if (!archivedSelected.length) {
      setError("Select at least one archived short link to delete.")
      return
    }

    const confirmed = window.confirm(`Delete ${archivedSelected.length} archived short link${archivedSelected.length === 1 ? "" : "s"} permanently?`)
    if (!confirmed) return

    try {
      setBusyLinkId("bulk-delete")
      const token = getAuthToken()
      if (!token) {
        router.replace("/login")
        return
      }

      for (const link of archivedSelected) {
        await apiRequest(`/short-links/${link.id}?force=true`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        })
      }

      setSelectedLinkIds((prev) => prev.filter((id) => !archivedSelected.some((link) => link.id === id)))
      await loadLinks()
      setMessage(`Deleted ${archivedSelected.length} archived short link${archivedSelected.length === 1 ? "" : "s"}.`)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusyLinkId("")
    }
  }

  async function handleToggleAnalysis(linkId) {
    const token = getAuthToken()
    if (!token) {
      router.replace("/login")
      return
    }

    if (analysisLinkId === linkId) {
      setAnalysisLinkId("")
      return
    }

    setAnalysisLinkId(linkId)

    if (analysisById[linkId]) {
      return
    }

    try {
      setAnalysisLoadingId(linkId)
      const data = await apiRequest(`/short-links/${linkId}/analysis`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setAnalysisById((prev) => ({
        ...prev,
        [linkId]: data.analysis,
      }))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setAnalysisLoadingId("")
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-[112rem] px-5 py-8 md:px-8 xl:px-10">
        <div className="grid gap-6 xl:grid-cols-[15rem_minmax(0,1fr)]">
          <aside className="hidden xl:block">
            <div className="sticky top-24 space-y-4">
              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Workspace</p>
                <div className="mt-4 grid gap-2">
                  <Link href="/dashboard" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white">
                    QR Dashboard
                  </Link>
                  <Link href="/short-links" className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-700 shadow-sm">
                    Short Links
                  </Link>
                </div>
              </div>
              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Page Navigation</p>
                <nav className="mt-4 space-y-2 text-sm">
                  <a href="#short-links-overview" className="block rounded-2xl px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50">Overview</a>
                  <a href="#short-links-create" className="block rounded-2xl px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50">Create Link</a>
                  <a href="#short-links-library" className="block rounded-2xl px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50">Saved Links</a>
                </nav>
              </div>
            </div>
          </aside>

          <div className="space-y-6">
            <section id="short-links-overview" className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex flex-wrap items-center gap-3">
                <Link href="/dashboard" className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white">
                  QR Dashboard
                </Link>
                <span className="rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700">
                  Short Links
                </span>
              </div>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Short Links</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Create shareable short links</h1>
              <p className="mt-3 max-w-4xl text-slate-600">
                Create clean short links like <span className="font-semibold text-slate-900">qrbulkgen.com/a7K9xQ</span>, manage custom slugs, set expiry dates, and review analytics inside each related short link.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 xl:hidden">
                <a href="#short-links-overview" className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white">
                  Overview
                </a>
                <a href="#short-links-create" className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white">
                  Create Link
                </a>
                <a href="#short-links-library" className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white">
                  Saved Links
                </a>
              </div>
            </section>

            <section id="short-links-create" className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">New short link</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Create a new redirect, keep the slug clean, and start tracking visits immediately.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 xl:shrink-0">
                  Freshly created links appear first in the saved list below.
                </div>
              </div>

              <form className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,0.95fr)_minmax(0,0.85fr)_auto]" onSubmit={handleCreate}>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Title</label>
                  <input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3" placeholder="Campaign landing page" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Target URL</label>
                  <input value={targetUrl} onChange={(event) => setTargetUrl(event.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3" placeholder="https://example.com" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Custom slug (optional)</label>
                  <input value={slug} onChange={(event) => setSlug(event.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3" placeholder="event2026" />
                  <p className="mt-1 text-xs text-slate-500">Leave blank to auto-generate.</p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Expiry (optional)</label>
                  <input value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3" placeholder="DD-MM-YYYY" />
                </div>
                <div className="flex items-end xl:min-w-[11rem]">
                  <button disabled={isSubmitting} className="w-full rounded-xl bg-slate-950 px-4 py-3 font-semibold text-white disabled:opacity-60">
                    {isSubmitting ? "Creating..." : "Create Short Link"}
                  </button>
                </div>
              </form>

              {message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}
              {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
            </section>

            <section id="short-links-library" className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
              <div className="sticky top-20 z-20 border-b border-slate-200 bg-white/95 px-4 pt-4 pb-3 backdrop-blur">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
                  <label className="text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-500 xl:min-w-[11rem]">
                    Status
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                      className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[15px] text-slate-900 shadow-sm outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
                    >
                      <option value="active">Active</option>
                      <option value="all">All</option>
                      <option value="archived">Archived</option>
                      <option value="expired">Expired</option>
                      <option value="expiring">Expiring Soon</option>
                    </select>
                  </label>
                  <label className="text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-500 xl:min-w-[11rem]">
                    Activity
                    <select
                      value={filters.activity}
                      onChange={(e) => setFilters((prev) => ({ ...prev, activity: e.target.value }))}
                      className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[15px] text-slate-900 shadow-sm outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
                    >
                      <option value="all">All activity</option>
                      <option value="clicked">With clicks</option>
                      <option value="unclicked">Without clicks</option>
                    </select>
                  </label>
                  <label className="text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-500 xl:min-w-[10rem]">
                    Start Date
                    <input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
                      className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[15px] text-slate-900 shadow-sm outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
                    />
                  </label>
                  <label className="text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-500 xl:min-w-[10rem]">
                    End Date
                    <input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
                      className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[15px] text-slate-900 shadow-sm outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setFilters({ status: "active", activity: "all", startDate: "", endDate: "" })}
                    className="h-12 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
              <div className="px-4 py-4 text-xs text-slate-500">
                Active short links stay visible by default. Switch to <span className="font-semibold text-slate-700">Archived</span> or <span className="font-semibold text-slate-700">All</span> to review older links and permanently delete archived ones.
              </div>

              <div className="rounded-3xl bg-white p-5 shadow-sm md:p-6">
                {createdLink ? (
                  <div className="mb-5 rounded-2xl border border-sky-200 bg-sky-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Latest short link</p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">{createdLink.url}</p>
                    <p className="mt-1 text-sm text-slate-600">Target: {createdLink.targetUrl}</p>
                  </div>
                ) : null}

                {isLoading ? <p className="text-slate-600">Loading short links...</p> : null}
                {!isLoading && !filteredLinks.length ? (
                  <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50/80 px-6 py-8 text-center">
                    <p className="text-base font-semibold text-slate-900">No short links found</p>
                    <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                      Try changing the status, activity, or date filters. Newly created short links will appear here automatically.
                    </p>
                  </div>
                ) : null}

                {!!filteredLinks.length && (
                  <div className="grid gap-5">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm">
                          <input
                            type="checkbox"
                            checked={allFilteredSelected}
                            onChange={toggleSelectAllFiltered}
                            className="h-4 w-4 rounded border-slate-300 accent-slate-950 focus:ring-sky-200"
                          />
                          <span>Select all</span>
                        </label>
                        <p className="text-sm text-slate-600">
                          <span className="font-semibold text-slate-900">{selectedLinkIds.length}</span> link{selectedLinkIds.length === 1 ? "" : "s"} selected
                        </p>
                      </div>
                      {!!selectedLinkIds.length && (
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={handleBulkArchive}
                            disabled={!activeSelectedCount || busyLinkId === "bulk-archive"}
                            className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm font-semibold text-amber-700 shadow-sm transition hover:border-amber-300 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Archive selected{activeSelectedCount ? ` (${activeSelectedCount})` : ""}
                          </button>
                          <button
                            type="button"
                            onClick={handleBulkDelete}
                            disabled={!archivedSelectedCount || busyLinkId === "bulk-delete"}
                            className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700 shadow-sm transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Delete selected{archivedSelectedCount ? ` (${archivedSelectedCount})` : ""}
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedLinkIds([])}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300"
                          >
                            Clear selection
                          </button>
                        </div>
                      )}
                    </div>

                    {filteredLinks.map((link) => (
                      <article key={link.id} className="group relative overflow-hidden rounded-[1.9rem] border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/60 md:p-6">
                        <div className={`absolute inset-y-0 left-0 w-1.5 ${link.archivedAt ? "bg-amber-500" : isExpiredLink(link) ? "bg-rose-500" : Number(link.clickCount || 0) > 0 ? "bg-sky-500" : "bg-slate-300"}`} />
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                          <div className="flex items-start gap-4">
                            <label className="mt-1.5 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 shadow-sm transition group-hover:border-slate-300">
                              <input
                                type="checkbox"
                                checked={selectedLinkIds.includes(link.id)}
                                onChange={() => toggleSelectedLink(link.id)}
                                className="h-4 w-4 rounded border-slate-300 accent-slate-950 focus:ring-sky-200"
                              />
                            </label>
                            <div className="space-y-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${link.archivedAt ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                                  {link.archivedAt ? "Archived" : "Active"}
                                </span>
                                <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                                  Clicks: {link.clickCount}
                                </span>
                                {isExpiredLink(link) ? (
                                  <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">Expired</span>
                                ) : isExpiringSoonLink(link) ? (
                                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">Expiring soon</span>
                                ) : null}
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-slate-950">{link.title || link.slug}</h3>
                                <p className="mt-1 font-mono text-xs text-slate-500">{link.id}</p>
                              </div>
                              <p className="break-all text-sm font-medium text-slate-900">{link.url}</p>
                              <p className="break-all text-sm text-slate-600">Target: {link.targetUrl}</p>
                              <div className="grid gap-x-6 gap-y-1.5 border-t border-slate-100 pt-2 text-sm text-slate-600 sm:grid-cols-2">
                                <p><span className="font-medium text-slate-900">Created:</span> {formatDate(link.createdAt)}</p>
                                <p><span className="font-medium text-slate-900">Last visit:</span> {formatDate(link.lastVisitedAt)}</p>
                                <p><span className="font-medium text-slate-900">Expiry:</span> {formatDate(link.expiresAt)}</p>
                                <p><span className="font-medium text-slate-900">Slug:</span> {link.slug}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 lg:max-w-[30rem] lg:flex-nowrap lg:justify-end">
                            <button type="button" onClick={() => copyLink(link.url)} className="rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow">
                              Copy
                            </button>
                            <button type="button" onClick={() => handleToggleAnalysis(link.id)} className="rounded-2xl border border-sky-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-sky-700 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow">
                              {analysisLinkId === link.id ? "Hide Analysis" : "Analysis"}
                            </button>
                            <a href={link.url} target="_blank" rel="noreferrer" className="rounded-2xl border border-sky-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-sky-700 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow">
                              Open
                            </a>
                            <button
                              type="button"
                              onClick={() => handleDelete(link)}
                              disabled={busyLinkId === link.id}
                              className={`rounded-2xl bg-white px-3.5 py-2.5 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow disabled:cursor-not-allowed disabled:opacity-50 ${link.archivedAt ? "border border-rose-200 text-rose-700 hover:border-rose-300" : "border border-amber-200 text-amber-700 hover:border-amber-300"}`}
                            >
                              {link.archivedAt ? "Delete Permanently" : "Archive"}
                            </button>
                          </div>
                        </div>

                        {analysisLinkId === link.id ? (
                          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                            {analysisLoadingId === link.id ? (
                              <p className="text-sm text-slate-500">Loading analysis...</p>
                            ) : analysisById[link.id] ? (
                              <div className="space-y-5">
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                  <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Short Link Analytics</p>
                                    <h4 className="mt-2 text-xl font-semibold text-slate-950">{link.title || link.slug}</h4>
                                    <p className="mt-1 text-sm text-slate-500">Analysis is now tied directly to this related short link instead of a separate top summary block.</p>
                                  </div>
                                  <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-slate-700">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">Quick Insight</p>
                                    <p className="mt-2 leading-6">{analysisById[link.id].quickInsight}</p>
                                  </div>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                  <AnalyticsCard label="Total Visits" value={analysisById[link.id].totalVisits} tone="accent" />
                                  <AnalyticsCard label="Unique Visits" value={analysisById[link.id].uniqueVisits} tone="success" />
                                  <AnalyticsCard label="Repeat Visits" value={analysisById[link.id].repeatVisits} />
                                  <AnalyticsCard
                                    label="Expiry State"
                                    value={analysisById[link.id].isExpired ? "Expired" : analysisById[link.id].expiresAt ? "Scheduled" : "Open"}
                                    tone={analysisById[link.id].isExpired ? "danger" : "default"}
                                  />
                                </div>

                                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                                    <h4 className="text-base font-semibold text-slate-950">Visit breakdown</h4>
                                    <div className="mt-4 space-y-4">
                                      <ProgressRow
                                        label="Unique visitors"
                                        value={analysisById[link.id].uniqueVisits}
                                        total={Math.max(analysisById[link.id].totalVisits, 1)}
                                        colorClass="bg-sky-500"
                                      />
                                      <ProgressRow
                                        label="Repeat visits"
                                        value={analysisById[link.id].repeatVisits}
                                        total={Math.max(analysisById[link.id].totalVisits, 1)}
                                        colorClass="bg-emerald-500"
                                      />
                                    </div>
                                  </div>

                                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                                    <h4 className="text-base font-semibold text-slate-950">7-day trend</h4>
                                    <div className="mt-4">
                                      <Sparkline points={analysisById[link.id].trend || []} />
                                    </div>
                                  </div>
                                </div>

                                <div className="grid gap-4 lg:grid-cols-2">
                                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                                    <h4 className="text-base font-semibold text-slate-950">Link details</h4>
                                    <div className="mt-4 space-y-2 text-sm text-slate-600">
                                      <p><span className="font-semibold text-slate-900">Short URL:</span> {link.url}</p>
                                      <p><span className="font-semibold text-slate-900">Target:</span> {analysisById[link.id].targetUrl}</p>
                                      <p><span className="font-semibold text-slate-900">Created:</span> {formatDate(analysisById[link.id].createdAt)}</p>
                                      <p><span className="font-semibold text-slate-900">Last visit:</span> {formatDate(analysisById[link.id].lastVisitedAt)}</p>
                                      <p><span className="font-semibold text-slate-900">Expiry:</span> {formatDate(analysisById[link.id].expiresAt)}</p>
                                    </div>
                                  </div>

                                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                                    <h4 className="text-base font-semibold text-slate-950">Recent visitors</h4>
                                    {(analysisById[link.id].latestVisitors || []).length ? (
                                      <div className="mt-4 space-y-3">
                                        {analysisById[link.id].latestVisitors.map((visitor, index) => (
                                          <div key={`${visitor.visitedAt}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                                            <p className="font-medium text-slate-900">{formatDate(visitor.visitedAt)}</p>
                                            <p className="mt-1 break-all">{visitor.userAgent || "Unknown browser"}</p>
                                            <p className="mt-1 text-xs text-slate-500">{visitor.ipAddress || "IP unavailable"}</p>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="mt-4 text-sm leading-6 text-slate-500">
                                        No visitor log has been recorded yet for this short link.
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}

