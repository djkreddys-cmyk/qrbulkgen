"use client"

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

function formatCompactDate(value) {
  if (!value) return "Not set"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "Not set"
  return parsed.toLocaleDateString()
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
          {helper ? ` • ${helper}` : ""}
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
  const [showArchived, setShowArchived] = useState(false)
  const [links, setLinks] = useState([])
  const [createdLink, setCreatedLink] = useState(null)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [analysisLinkId, setAnalysisLinkId] = useState("")
  const [analysisLoadingId, setAnalysisLoadingId] = useState("")
  const [analysisById, setAnalysisById] = useState({})

  const activeLinks = useMemo(
    () => links.filter((link) => (showArchived ? true : !link.archivedAt)),
    [links, showArchived],
  )

  const analytics = useMemo(() => {
    const totalLinks = links.length
    const archivedLinks = links.filter((link) => Boolean(link.archivedAt)).length
    const activeOnlyLinks = links.filter((link) => !link.archivedAt).length
    const totalClicks = links.reduce((sum, link) => sum + Number(link.clickCount || 0), 0)
    const clickedLinks = links.filter((link) => Number(link.clickCount || 0) > 0)
    const topLink = [...links].sort((a, b) => Number(b.clickCount || 0) - Number(a.clickCount || 0))[0] || null
    const expiredLinks = links.filter((link) => {
      if (!link.expiresAt) return false
      const parsed = new Date(link.expiresAt)
      return !Number.isNaN(parsed.getTime()) && parsed.getTime() < Date.now()
    }).length
    const expiringSoonLinks = links.filter((link) => {
      if (!link.expiresAt) return false
      const parsed = new Date(link.expiresAt)
      if (Number.isNaN(parsed.getTime())) return false
      const diff = parsed.getTime() - Date.now()
      return diff >= 0 && diff <= 1000 * 60 * 60 * 24 * 7
    }).length
    const latestVisit = [...links]
      .filter((link) => link.lastVisitedAt)
      .sort((a, b) => new Date(b.lastVisitedAt).getTime() - new Date(a.lastVisitedAt).getTime())[0] || null

    return {
      totalLinks,
      archivedLinks,
      activeOnlyLinks,
      totalClicks,
      clickedLinks: clickedLinks.length,
      topLink,
      expiredLinks,
      expiringSoonLinks,
      latestVisit,
    }
  }, [links])

  async function loadLinks(nextShowArchived = showArchived) {
    const token = getAuthToken()
    if (!token) {
      router.replace("/login")
      return
    }

    try {
      const data = await apiRequest(`/short-links?includeArchived=${nextShowArchived ? "true" : "false"}`, {
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
    loadLinks(showArchived)
  }, [showArchived]) // eslint-disable-line react-hooks/exhaustive-deps

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
      await loadLinks(showArchived)
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
      await apiRequest(`/short-links/${link.id}${force ? "?force=true" : ""}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      await loadLinks(showArchived || !force)
      setMessage(force ? "Short link deleted permanently." : "Short link archived.")
    } catch (requestError) {
      setError(requestError.message)
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
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Short Links</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Create shareable short links</h1>
          <p className="mt-3 max-w-3xl text-slate-600">
            Create clean short links like <span className="font-semibold text-slate-900">qrbulkgen.com/a7K9xQ</span>, manage custom slugs, set expiry dates, and track click performance from one place.
          </p>
        </section>

        <section className="space-y-5 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Short link analytics</h2>
              <p className="mt-1 text-sm text-slate-500">
                Monitor active links, click activity, expiry watch, and top-performing destinations in one dashboard-style view.
              </p>
            </div>
            {analytics.topLink ? (
              <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-slate-700">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">Top performer</p>
                <p className="mt-1 font-semibold text-slate-950">{analytics.topLink.title || analytics.topLink.slug}</p>
                <p className="mt-1 text-slate-600">{analytics.topLink.clickCount} clicks</p>
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AnalyticsCard
              label="Total Links"
              value={analytics.totalLinks}
              helper="All short links created under this account."
            />
            <AnalyticsCard
              label="Active Links"
              value={analytics.activeOnlyLinks}
              tone="success"
              helper="Links currently available for sharing and redirects."
            />
            <AnalyticsCard
              label="Total Clicks"
              value={analytics.totalClicks}
              tone="accent"
              helper="Combined visits recorded across your short links."
            />
            <AnalyticsCard
              label="Archived Links"
              value={analytics.archivedLinks}
              tone="danger"
              helper="Archived links stay reviewable and can be permanently deleted."
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-base font-semibold text-slate-950">Click activity</h3>
              <div className="mt-4 space-y-4">
                <ProgressRow
                  label="Links with visits"
                  value={analytics.clickedLinks}
                  total={Math.max(analytics.totalLinks, 1)}
                  colorClass="bg-sky-500"
                  helper={`${analytics.totalClicks} total clicks`}
                />
                <ProgressRow
                  label="Links without visits"
                  value={Math.max(analytics.totalLinks - analytics.clickedLinks, 0)}
                  total={Math.max(analytics.totalLinks, 1)}
                  colorClass="bg-slate-400"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-base font-semibold text-slate-950">Expiry watch</h3>
              <div className="mt-4 space-y-4">
                <ProgressRow
                  label="Expiring in 7 days"
                  value={analytics.expiringSoonLinks}
                  total={Math.max(analytics.totalLinks, 1)}
                  colorClass="bg-amber-500"
                />
                <ProgressRow
                  label="Expired"
                  value={analytics.expiredLinks}
                  total={Math.max(analytics.totalLinks, 1)}
                  colorClass="bg-rose-500"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-base font-semibold text-slate-950">Latest activity</h3>
              {analytics.latestVisit ? (
                <div className="mt-4 space-y-2 text-sm text-slate-600">
                  <p className="font-semibold text-slate-950">{analytics.latestVisit.title || analytics.latestVisit.slug}</p>
                  <p>{analytics.latestVisit.url}</p>
                  <p>Visited: {formatDate(analytics.latestVisit.lastVisitedAt)}</p>
                  <p>Created: {formatCompactDate(analytics.latestVisit.createdAt)}</p>
                </div>
              ) : (
                <p className="mt-4 text-sm leading-6 text-slate-500">
                  No visit activity has been recorded yet. Once people start opening your short links, the latest activity will appear here.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">New short link</h2>
              <p className="mt-1 text-sm text-slate-500">
                Create a new redirect, keep the slug clean, and start tracking visits immediately.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Freshly created links appear first in the saved list below.
            </div>
          </div>

          <form className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)_minmax(0,0.85fr)_minmax(0,0.8fr)_auto]" onSubmit={handleCreate}>
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
            <div className="flex items-end">
              <button disabled={isSubmitting} className="w-full rounded-xl bg-slate-950 px-4 py-3 font-semibold text-white disabled:opacity-60">
                {isSubmitting ? "Creating..." : "Create Short Link"}
              </button>
            </div>
          </form>

          {message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}
          {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
        </section>

        <section className="space-y-4 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Saved short links</h2>
              <p className="mt-1 text-sm text-slate-500">Track click counts and manage active or archived links separately.</p>
            </div>
            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} />
              Show archived
            </label>
          </div>

          {createdLink ? (
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Latest short link</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">{createdLink.url}</p>
              <p className="mt-1 text-sm text-slate-600">Target: {createdLink.targetUrl}</p>
            </div>
          ) : null}

          {isLoading ? <p className="text-slate-600">Loading short links...</p> : null}
          {!isLoading && !activeLinks.length ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-slate-500">
              No short links yet. Create your first one here.
            </div>
          ) : null}

          <div className="space-y-4">
            {activeLinks.map((link) => (
              <article key={link.id} className="rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                          {link.archivedAt ? "Archived" : "Active"}
                        </span>
                        <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                          Clicks: {link.clickCount}
                        </span>
                      </div>
                      <h3 className="mt-3 text-lg font-semibold text-slate-950">{link.title || link.slug}</h3>
                      <p className="mt-2 break-all text-sm font-medium text-slate-900">{link.url}</p>
                      <p className="mt-2 break-all text-sm text-slate-600">Target: {link.targetUrl}</p>
                      <div className="mt-3 grid gap-2 text-sm text-slate-500 md:grid-cols-2">
                        <p>Created: {formatDate(link.createdAt)}</p>
                        <p>Last visit: {formatDate(link.lastVisitedAt)}</p>
                        <p>Expiry: {formatDate(link.expiresAt)}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => copyLink(link.url)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Copy</button>
                      <button onClick={() => handleToggleAnalysis(link.id)} className="rounded-xl border border-sky-200 px-4 py-2 text-sm font-semibold text-sky-700">
                        {analysisLinkId === link.id ? "Hide Analysis" : "Analysis"}
                      </button>
                      <a href={link.url} target="_blank" rel="noreferrer" className="rounded-xl border border-sky-200 px-4 py-2 text-sm font-semibold text-sky-700">Open</a>
                      <button onClick={() => handleDelete(link)} className={`rounded-xl px-4 py-2 text-sm font-semibold ${link.archivedAt ? "border border-rose-200 text-rose-700" : "border border-amber-200 text-amber-700"}`}>
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
                          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">Quick Insight</p>
                            <p className="mt-2 text-sm leading-6 text-slate-700">{analysisById[link.id].quickInsight}</p>
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
        </section>
      </main>
    </div>
  )
}
