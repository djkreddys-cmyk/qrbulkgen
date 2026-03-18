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
      <main className="mx-auto max-w-[88rem] px-5 py-8 md:px-6 xl:px-8">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/generate" className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white">
              Generate
            </Link>
            <span className="rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700">
              Short URL
            </span>
          </div>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Short URL</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Create shareable short URLs</h1>
          <p className="mt-3 max-w-4xl text-slate-600">
            Create clean short URLs, set custom slugs, and choose expiry here. Link analytics and analysis reports now live on the dashboard.
          </p>
        </section>

        <section className="mt-6 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">New short URL</h2>
              <p className="mt-1 text-sm text-slate-500">
                Create a new redirect, keep the slug clean, and start tracking visits immediately.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 xl:shrink-0">
              Open the dashboard to review saved short URLs and analysis.
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

          {createdLink ? (
            <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Latest short URL</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">{createdLink.url}</p>
              <p className="mt-1 text-sm text-slate-600">Target: {createdLink.targetUrl}</p>
            </div>
          ) : null}

          {message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}
          {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
        </section>
      </main>
    </div>
  )
}

