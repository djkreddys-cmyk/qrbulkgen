"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import Navbar from "../../components/Navbar"
import { apiRequest, API_BASE_URL } from "../../lib/api"
import { clearAuthSession, getAuthToken } from "../../lib/auth"

function toAbsoluteDownloadUrl(filePath) {
  if (!filePath) return ""
  if (/^(https?:\/\/|data:)/i.test(filePath)) return filePath
  const origin = API_BASE_URL.replace(/\/api\/?$/, "")
  return `${origin}${filePath}`
}

function buildQuery(filters) {
  const params = new URLSearchParams()
  if (filters.startDate) params.set("startDate", filters.startDate)
  if (filters.endDate) params.set("endDate", filters.endDate)
  params.set("includeArchived", "true")
  return params.toString() ? `?${params.toString()}` : ""
}

function AnalysisStat({ label, value, tone = "default" }) {
  const toneClass =
    tone === "success"
      ? "text-emerald-600"
      : tone === "danger"
        ? "text-rose-600"
        : tone === "accent"
          ? "text-sky-700"
          : "text-slate-900"

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  )
}

function ProgressBar({ label, value, total, colorClass = "bg-sky-500", helper }) {
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

function getStatusAccent(status) {
  if (status === "completed") {
    return "bg-emerald-500"
  }
  if (status === "processing" || status === "queued") {
    return "bg-amber-500"
  }
  if (status === "failed") {
    return "bg-rose-500"
  }
  return "bg-slate-400"
}

function PerformanceBadge({ label, tone = "default" }) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : tone === "warning"
        ? "bg-amber-50 text-amber-700 border-amber-200"
      : tone === "danger"
          ? "bg-rose-50 text-rose-700 border-rose-200"
        : tone === "accent"
          ? "bg-sky-50 text-sky-700 border-sky-200"
          : "bg-slate-100 text-slate-700 border-slate-200"

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneClass}`}>
      {label}
    </span>
  )
}

function MetricPill({ label, value, tone = "default" }) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "danger"
        ? "bg-rose-50 text-rose-700"
        : tone === "accent"
          ? "bg-sky-50 text-sky-700"
          : "bg-slate-100 text-slate-700"

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${toneClass}`}>
      {label}: {value}
    </span>
  )
}

function formatDateTime(value) {
  if (!value) return "Not yet"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "Not yet"
  return parsed.toLocaleString()
}

function formatCompactDate(value) {
  if (!value) return "Not set"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "Not set"
  return parsed.toLocaleDateString()
}

function Sparkline({ points }) {
  if (!points.length) {
    return <p className="text-xs text-slate-400">No scan trend yet.</p>
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

function EmptyState({ title, body }) {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50/80 px-6 py-8 text-center">
      <p className="text-base font-semibold text-slate-900">{title}</p>
      <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">{body}</p>
    </div>
  )
}

function getThumbnailSource(job) {
  const filePath = job?.artifact?.filePath || ""
  if (!filePath) return ""
  const lowered = String(filePath).toLowerCase()
  if (lowered.startsWith("data:image/") || /\.(png|jpg|jpeg|webp|gif|svg)$/.test(lowered)) {
    return toAbsoluteDownloadUrl(filePath)
  }
  return ""
}

function getJobTitle(job) {
  return job.jobType === "single" ? job.qrType || "Single QR" : `${job.qrType || "Bulk"} Bulk`
}

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [jobs, setJobs] = useState([])
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState({ startDate: "", endDate: "", qrType: "all", status: "active" })
  const [busyJobId, setBusyJobId] = useState("")
  const [analysisJobId, setAnalysisJobId] = useState("")
  const [jobAnalysisById, setJobAnalysisById] = useState({})
  const [analysisLoadingId, setAnalysisLoadingId] = useState("")
  const [analysisTabByJobId, setAnalysisTabByJobId] = useState({})

  const queryString = useMemo(() => buildQuery(filters), [filters])

  async function loadData(activeQuery = queryString) {
    const token = getAuthToken()
    if (!token) {
      router.replace("/login")
      return
    }

    try {
      const headers = { Authorization: `Bearer ${token}` }
      const [meData, jobsData] = await Promise.all([
        apiRequest("/auth/me", { headers }),
        apiRequest(`/qr/jobs?limit=36${activeQuery ? `&${activeQuery.slice(1)}` : ""}`, { headers }),
      ])
      setUser(meData.user)
      setJobs(jobsData.jobs || [])
      setError("")
    } catch (requestError) {
      if (requestError?.status === 401) {
        clearAuthSession()
        router.replace("/login")
      }
      setError(requestError.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [queryString]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDeleteJob(job) {
    const token = getAuthToken()
    if (!token) return
    const jobId = job.id
    const isArchived = Boolean(job.archivedAt)
    const confirmed = window.confirm(
      isArchived
        ? "Permanently delete this archived QR job? This will remove the job and its related data from the server."
        : "Archive this QR job? You can still review it later from the Archived filter.",
    )
    if (!confirmed) return

    try {
      setBusyJobId(jobId)
      await apiRequest(`/qr/jobs/${jobId}${isArchived ? "?force=true" : ""}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!isArchived) {
        setFilters((prev) => ({ ...prev, status: "archived" }))
      }
      await loadData(queryString)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusyJobId("")
    }
  }

  async function handleToggleAnalysis(jobId) {
    const token = getAuthToken()
    if (!token) return

    if (analysisJobId === jobId) {
      setAnalysisJobId("")
      return
    }

    setAnalysisJobId(jobId)

    if (jobAnalysisById[jobId]) {
      return
    }

    try {
      setAnalysisLoadingId(jobId)
      const data = await apiRequest(`/qr/jobs/${jobId}/analysis`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setJobAnalysisById((prev) => ({
        ...prev,
        [jobId]: data.analysis,
      }))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setAnalysisLoadingId("")
    }
  }

  function getAnalysisTab(jobId) {
    return analysisTabByJobId[jobId] || "overview"
  }

  function setAnalysisTab(jobId, tab) {
    setAnalysisTabByJobId((prev) => ({
      ...prev,
      [jobId]: tab,
    }))
  }

  function handleEditJob(job) {
    const mode = job.jobType === "bulk" ? "bulk" : "single"
    const params = new URLSearchParams({ mode })
    if (job.jobType === "single") {
      params.set("editJob", job.id)
    }
    router.push(`/generate?${params.toString()}`)
  }
  const qrTypeOptions = useMemo(() => {
    return ["all", ...Array.from(new Set(jobs.map((job) => job.qrType).filter(Boolean))).sort((a, b) => a.localeCompare(b))]
  }, [jobs])

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (filters.qrType !== "all" && job.qrType !== filters.qrType) {
        return false
      }

      if (filters.status === "archived") {
        return Boolean(job.archivedAt)
      }

      if (filters.status === "active") {
        return !job.archivedAt
      }

      if (filters.status !== "all") {
        return !job.archivedAt && job.status === filters.status
      }

      return true
    })
  }, [filters.qrType, filters.status, jobs])

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-[96rem] space-y-6 px-3 py-6 md:px-5">
        <section className="flex flex-col gap-5 rounded-[2rem] border border-slate-200 bg-gradient-to-br from-white to-slate-100 p-8 shadow-sm lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Control Center</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Analytics Dashboard</h1>
            {user && <p className="mt-3 max-w-4xl text-slate-600">Welcome back, {user.name || user.email}. Open analysis on any created QR to inspect generation quality, scan behavior, response depth, and expiry health in one focused dashboard.</p>}
          </div>
        </section>

        <section className="sticky top-20 z-10 rounded-[1.75rem] border border-slate-200 bg-white/95 p-4 shadow-md shadow-slate-200/40 backdrop-blur">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
            <label className="text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-500 xl:min-w-[11rem]">
              QR Type
              <select
                value={filters.qrType}
                onChange={(e) => setFilters((prev) => ({ ...prev, qrType: e.target.value }))}
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[15px] text-slate-900 shadow-sm outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
              >
                <option value="all">All QR types</option>
                {qrTypeOptions
                  .filter((option) => option !== "all")
                  .map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
              </select>
            </label>
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
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="processing">Processing</option>
                <option value="queued">Queued</option>
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
              onClick={() => setFilters({ startDate: "", endDate: "", qrType: "all", status: "active" })}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow"
            >
              Clear Filters
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3 text-xs text-slate-500">
            <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">Live control strip</span>
            <span>Archived QR jobs appear here when Status is set to <span className="font-semibold text-slate-700">Archived</span> or <span className="font-semibold text-slate-700">All</span>. Archived rows show a permanent delete action.</span>
          </div>
        </section>

        {isLoading && <p className="text-slate-600">Loading dashboard...</p>}
        {!isLoading && error && <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">{error}</p>}

        {!isLoading && (
          <>
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              {!filteredJobs.length && (
                <EmptyState
                  title={filters.status === "archived" ? "No archived QR jobs yet" : "No QR jobs found"}
                  body={
                    filters.status === "archived"
                      ? "Archived jobs will appear here after you archive them from the active dashboard. Once archived, you can permanently delete them."
                      : "Try changing the QR type, status, or date filters. Newly created QR jobs will appear here automatically."
                  }
                />
              )}

              {!!filteredJobs.length && (
                <div className="grid gap-5">
                  {filteredJobs.map((job) => (
                    <article key={job.id} className="group relative overflow-hidden rounded-[1.9rem] border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/60 md:p-6">
                      <div className={`absolute inset-y-0 left-0 w-1.5 ${getStatusAccent(job.status)}`} />
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex items-start gap-4">
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 ring-4 ring-slate-50 transition group-hover:ring-sky-50">
                            {getThumbnailSource(job) ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={getThumbnailSource(job)} alt={getJobTitle(job)} className="h-full w-full object-cover" />
                            ) : (
                              <span className="px-2 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                {(job.qrType || "QR").slice(0, 6)}
                              </span>
                            )}
                          </div>
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                              {job.status}
                            </span>
                            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                              {job.jobType === "single" ? "Single QR" : `${job.qrType} Bulk`}
                            </span>
                            {job.archivedAt ? <PerformanceBadge label="Archived" tone="warning" /> : null}
                            {job.status === "completed" && job.successCount > 0 ? (
                              <PerformanceBadge label="Ready to share" tone="success" />
                            ) : null}
                            {job.failureCount > 0 ? (
                              <PerformanceBadge label="Needs review" tone="danger" />
                            ) : null}
                            {job.status === "completed" && job.successCount > 0 && !job.failureCount ? (
                              <PerformanceBadge label="Clean output" tone="success" />
                            ) : null}
                            {jobAnalysisById[job.id]?.typePerformance &&
                            (jobAnalysisById[job.id].job?.successCount || 0) / Math.max(jobAnalysisById[job.id].job?.totalCount || 1, 1) >=
                              (jobAnalysisById[job.id].typePerformance.successCount || 0) /
                                Math.max(jobAnalysisById[job.id].typePerformance.requestedCount || 1, 1) &&
                            (jobAnalysisById[job.id].engagement?.totalScans || 0) > 0 ? (
                              <PerformanceBadge label="Top Performer" tone="accent" />
                            ) : null}
                          </div>
                          <h3 className="text-lg font-semibold text-slate-950">{getJobTitle(job)}</h3>
                          <p className="font-mono text-xs text-slate-500">{job.id}</p>
                          <div className="grid gap-x-6 gap-y-1.5 border-t border-slate-100 pt-2 text-sm text-slate-600 sm:grid-cols-2">
                            <p><span className="font-medium text-slate-900">Type:</span> {job.qrType || "-"}</p>
                            <p><span className="font-medium text-slate-900">File:</span> {job.sourceFileName || "-"}</p>
                            <p><span className="font-medium text-slate-900">Requested:</span> {job.totalCount}</p>
                            <p><span className="font-medium text-slate-900">Success / Failure:</span> {job.successCount} / {job.failureCount}</p>
                          </div>
                          {job.errorMessage && <p className="text-sm text-rose-600">{job.errorMessage}</p>}
                        </div>
                        </div>

                        <div className="flex flex-wrap gap-2 lg:max-w-[21rem] lg:justify-end">
                          <button
                            type="button"
                            onClick={() => handleEditJob(job)}
                            className="rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow"
                          >
                            {job.jobType === "single" ? "Edit QR" : "Open Bulk"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleAnalysis(job.id)}
                            className="rounded-2xl border border-sky-200 bg-sky-50 px-3.5 py-2.5 text-sm font-semibold text-sky-700 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:bg-white"
                          >
                            {analysisJobId === job.id ? "Hide Analysis" : "Analysis"}
                          </button>
                          {job.artifact?.filePath && (
                            <a
                              className="rounded-2xl bg-slate-950 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow"
                              href={toAbsoluteDownloadUrl(job.artifact.filePath)}
                              target={String(job.artifact.filePath).startsWith("data:") ? undefined : "_blank"}
                              rel={String(job.artifact.filePath).startsWith("data:") ? undefined : "noreferrer"}
                              download={job.artifact.fileName || undefined}
                            >
                              Download
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteJob(job)}
                            disabled={busyJobId === job.id}
                            className={`rounded-2xl px-3.5 py-2.5 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 disabled:opacity-60 ${
                              job.archivedAt
                                ? "border border-rose-500 bg-rose-500 text-white hover:bg-rose-600"
                                : "border border-rose-200 bg-white text-rose-700 hover:border-rose-300 hover:bg-rose-50"
                            }`}
                          >
                            {busyJobId === job.id
                              ? job.archivedAt
                                ? "Deleting..."
                                : "Archiving..."
                              : job.archivedAt
                                ? "Delete Permanently"
                                : "Archive"}
                          </button>
                        </div>
                      </div>

                      {analysisJobId === job.id && (
                        <div className="mt-5 rounded-[1.6rem] border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-inner transition-all duration-200 md:p-5">
                          <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Analysis for this QR Job
                          </h4>
                          {analysisLoadingId === job.id ? (
                            <p className="mt-4 text-sm text-slate-500">Loading analysis...</p>
                          ) : jobAnalysisById[job.id] ? (
                            (() => {
                              const analysis = jobAnalysisById[job.id]
                              const totalRequested = analysis.job?.totalCount || job.totalCount || 0
                              const totalSuccess = analysis.job?.successCount || job.successCount || 0
                              const totalFailure = analysis.job?.failureCount || job.failureCount || 0
                              const totalScans = analysis.engagement?.totalScans || 0
                              const uniqueScans = analysis.engagement?.uniqueScans || 0
                              const repeatedScans = analysis.engagement?.repeatedScans || 0
                              const totalSubmissions = analysis.engagement?.totalSubmissions || 0
                              const hasTrackedEngagement = analysis.engagement?.managedLinks > 0
                              const currentTab = getAnalysisTab(job.id)
                              const scanTrendPoints = analysis.scanTrend || []
                              const typeAverageSuccessRate = analysis.typePerformance
                                ? (analysis.typePerformance.successCount || 0) /
                                  Math.max(analysis.typePerformance.requestedCount || 1, 1)
                                : 0
                              const thisJobSuccessRate = totalSuccess / Math.max(totalRequested || 1, 1)
                              const extraInsights = [
                                totalFailure > 0
                                  ? `${totalFailure} output${totalFailure === 1 ? "" : "s"} failed during generation and may need a rerun.`
                                  : "Generation quality is clean with no failed outputs recorded.",
                                totalScans > 0
                                  ? `This QR has ${uniqueScans} unique scan${uniqueScans === 1 ? "" : "s"} and ${repeatedScans} repeated visit${repeatedScans === 1 ? "" : "s"}.`
                                  : "No scan activity yet. Share or print this QR to start collecting engagement.",
                                analysis.engagement?.expiryDate
                                  ? `Expiry is ${analysis.engagement?.isExpired ? "already reached" : `set for ${formatDateTime(analysis.engagement.expiryDate)}`}.`
                                  : "No expiry date is set for this QR yet.",
                                thisJobSuccessRate >= typeAverageSuccessRate && totalScans > 0
                                  ? "This job is outperforming the average for its QR type."
                                  : "This job is still building enough activity to compare against its QR type average.",
                              ]
                              return (
                                <div className="mt-4 space-y-4">
                                <div className="flex flex-wrap gap-2">
                                  {[
                                    ["overview", "Overview"],
                                    ["scans", "Scans"],
                                    ["responses", "Responses"],
                                    ["expiry", "Expiry"],
                                  ].map(([tabValue, tabLabel]) => {
                                    const active = currentTab === tabValue
                                    return (
                                      <button
                                        key={`${job.id}-${tabValue}`}
                                        type="button"
                                        onClick={() => setAnalysisTab(job.id, tabValue)}
                                        className={`rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                                          active
                                            ? "bg-slate-950 text-white shadow-md shadow-slate-300/40"
                                            : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                                        }`}
                                      >
                                        {tabLabel}
                                      </button>
                                    )
                                  })}
                                </div>

                                <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
                                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                                    Quick Insight
                                  </p>
                                  <p className="mt-2 text-sm font-medium text-slate-800">{analysis.insight}</p>
                                </div>

                                {(currentTab === "overview" || currentTab === "scans") && (
                                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                  <div className="flex items-start justify-between gap-4">
                                    <div>
                                      <p className="font-medium text-slate-900">Generation Report</p>
                                      <p className="mt-1 text-sm text-slate-500">Output quality and completion performance for this QR job.</p>
                                    </div>
                                    <MetricPill
                                      label="Success Rate"
                                      value={totalRequested ? `${Math.round((totalSuccess / totalRequested) * 100)}%` : "0%"}
                                      tone="accent"
                                    />
                                  </div>
                                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                                    <AnalysisStat label="Requested" value={totalRequested} />
                                    <AnalysisStat label="Success" value={totalSuccess} tone="success" />
                                    <AnalysisStat label="Failure" value={totalFailure} tone="danger" />
                                    <AnalysisStat
                                      label="Artifact"
                                      value={job.artifact?.filePath ? "Ready" : "Pending"}
                                      tone={job.artifact?.filePath ? "accent" : "default"}
                                    />
                                  </div>
                                  <div className="mt-4 space-y-3">
                                    <ProgressBar
                                      label="Successful outputs"
                                      value={totalSuccess}
                                      total={Math.max(totalRequested, 1)}
                                      colorClass="bg-emerald-500"
                                      helper={totalRequested ? `${Math.round((totalSuccess / totalRequested) * 100)}%` : "0%"}
                                    />
                                    <ProgressBar
                                      label="Failed outputs"
                                      value={totalFailure}
                                      total={Math.max(totalRequested, 1)}
                                      colorClass="bg-rose-500"
                                      helper={totalRequested ? `${Math.round((totalFailure / totalRequested) * 100)}%` : "0%"}
                                    />
                                  </div>
                                </div>
                                )}

                                {(currentTab === "overview" || currentTab === "scans" || currentTab === "expiry") && (
                                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                  <div className="flex items-start justify-between gap-4">
                                    <div>
                                      <p className="font-medium text-slate-900">Usage Report</p>
                                      <p className="mt-1 text-sm text-slate-500">Scan volume, returning visitors, submissions, and expiry health for this QR.</p>
                                    </div>
                                    <MetricPill
                                      label="Tracked"
                                      value={hasTrackedEngagement ? "Yes" : "No"}
                                      tone={hasTrackedEngagement ? "success" : "default"}
                                    />
                                  </div>
                                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                                    <AnalysisStat label="Scans" value={totalScans} />
                                    <AnalysisStat label="Unique" value={uniqueScans} tone="accent" />
                                    <AnalysisStat label="Repeated" value={repeatedScans} />
                                    <AnalysisStat label="Submissions" value={totalSubmissions} tone="success" />
                                  </div>
                                  {(currentTab === "scans" || currentTab === "overview") && (
                                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                      <div className="flex items-center justify-between gap-3">
                                        <div>
                                          <p className="font-medium text-slate-900">Scan trend</p>
                                          <p className="mt-1 text-sm text-slate-500">Recent scan activity for this QR job.</p>
                                        </div>
                                        <MetricPill label="Points" value={scanTrendPoints.length} tone="accent" />
                                      </div>
                                      <div className="mt-4">
                                        <Sparkline points={scanTrendPoints} />
                                      </div>
                                    </div>
                                  )}
                                  <div className="mt-4 space-y-3">
                                    <ProgressBar
                                      label="Unique visitor share"
                                      value={uniqueScans}
                                      total={Math.max(totalScans, 1)}
                                      colorClass="bg-sky-500"
                                      helper={totalScans ? `${Math.round((uniqueScans / totalScans) * 100)}%` : "0%"}
                                    />
                                    <ProgressBar
                                      label="Repeat visitor share"
                                      value={repeatedScans}
                                      total={Math.max(totalScans, 1)}
                                      colorClass="bg-violet-500"
                                      helper={totalScans ? `${Math.round((repeatedScans / totalScans) * 100)}%` : "0%"}
                                    />
                                  </div>
                                  <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                                    <p>
                                      <span className="font-medium text-slate-900">Last scan:</span>{" "}
                                      {formatDateTime(analysis.engagement?.lastScanAt)}
                                    </p>
                                    <p>
                                      <span className="font-medium text-slate-900">Last submission:</span>{" "}
                                      {formatDateTime(analysis.engagement?.lastSubmissionAt)}
                                    </p>
                                    <p>
                                      <span className="font-medium text-slate-900">Tracked links:</span>{" "}
                                      {analysis.engagement?.managedLinks || 0}
                                    </p>
                                    <p>
                                      <span className="font-medium text-slate-900">Expiry date:</span>{" "}
                                      {analysis.engagement?.expiryDate ? formatDateTime(analysis.engagement.expiryDate) : "Not set"}
                                    </p>
                                    <p>
                                      <span className="font-medium text-slate-900">Engagement type:</span>{" "}
                                      {analysis.engagement?.targetKind || "Direct QR / not tracked"}
                                    </p>
                                    <p>
                                      <span className="font-medium text-slate-900">Expiring soon:</span>{" "}
                                      {analysis.engagement?.expiringSoonLinks || 0}
                                    </p>
                                    <p>
                                      <span className="font-medium text-slate-900">Expired links:</span>{" "}
                                      {analysis.engagement?.expiredLinks || 0}
                                    </p>
                                  </div>
                                </div>
                                )}

                                {currentTab === "overview" && (
                                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                  <p className="font-medium text-slate-900">Actionable Insights</p>
                                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
                                    {extraInsights.map((insight, index) => (
                                      <li key={`${job.id}-insight-${index}`}>{insight}</li>
                                    ))}
                                  </ul>
                                </div>
                                )}

                                {analysis.typePerformance && (currentTab === "overview" || currentTab === "scans") && (
                                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                    <div className="flex items-start justify-between gap-4">
                                      <div>
                                        <p className="font-medium text-slate-900">{job.qrType} overall performance</p>
                                        <p className="mt-1 text-sm text-slate-500">Compare this job against all created QRs of the same type.</p>
                                      </div>
                                      <MetricPill label="Jobs" value={analysis.typePerformance.jobsCount} />
                                    </div>
                                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                                      <AnalysisStat label="Requested" value={analysis.typePerformance.requestedCount} />
                                      <AnalysisStat label="Success" value={analysis.typePerformance.successCount} tone="success" />
                                      <AnalysisStat label="Failure" value={analysis.typePerformance.failureCount} tone="danger" />
                                    </div>
                                    <div className="mt-4 space-y-3">
                                      <ProgressBar
                                        label={`${job.qrType} success rate`}
                                        value={analysis.typePerformance.successCount}
                                        total={Math.max(analysis.typePerformance.requestedCount, 1)}
                                        colorClass="bg-emerald-500"
                                        helper={
                                          analysis.typePerformance.requestedCount
                                            ? `${Math.round((analysis.typePerformance.successCount / analysis.typePerformance.requestedCount) * 100)}%`
                                            : "0%"
                                        }
                                      />
                                    </div>
                                  </div>
                                )}

                                {analysis.rating && (currentTab === "overview" || currentTab === "responses") && (
                                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                    <p className="font-medium text-slate-900">Rating response breakdown</p>
                                    <div className="mt-3 space-y-2">
                                      {analysis.rating.buckets.map((bucket) => (
                                        <div key={bucket.label}>
                                          <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-700">{bucket.label}</span>
                                            <span className="text-slate-500">{bucket.count}</span>
                                          </div>
                                          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                                            <div
                                              className="h-full rounded-full bg-fuchsia-500"
                                              style={{
                                                width: `${Math.max(
                                                  (bucket.count / Math.max(...analysis.rating.buckets.map((entry) => entry.count), 1)) * 100,
                                                  6,
                                                )}%`,
                                              }}
                                            />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {analysis.feedback && (currentTab === "overview" || currentTab === "responses") && (
                                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                    <p className="font-medium text-slate-900">Feedback question summary</p>
                                    <div className="mt-3 space-y-3">
                                      {analysis.feedback.questions.map((question) => (
                                        <div key={question.label} className="rounded-2xl bg-slate-50 p-3">
                                          <div className="flex items-center justify-between gap-3">
                                            <span className="font-medium text-slate-800">{question.label}</span>
                                            <span className="text-sm text-slate-500">{question.responses} responses</span>
                                          </div>
                                          {!!question.latestAnswers.length && (
                                            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                                              {question.latestAnswers.map((answer, index) => (
                                                <li key={`${question.label}-${index}`}>{answer}</li>
                                              ))}
                                            </ul>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {currentTab === "expiry" && (
                                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                    <p className="font-medium text-slate-900">Expiry Focus</p>
                                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                                      <AnalysisStat
                                        label="Expiry State"
                                        value={
                                          analysis.engagement?.expiryDate
                                            ? analysis.engagement?.isExpired
                                              ? "Expired"
                                              : "Active"
                                            : "Not set"
                                        }
                                        tone={analysis.engagement?.isExpired ? "danger" : "success"}
                                      />
                                      <AnalysisStat
                                        label="Expiring Soon"
                                        value={analysis.engagement?.expiringSoonLinks || 0}
                                        tone="accent"
                                      />
                                      <AnalysisStat
                                        label="Expired Links"
                                        value={analysis.engagement?.expiredLinks || 0}
                                        tone="danger"
                                      />
                                    </div>
                                    <div className="mt-4 space-y-3">
                                      <ProgressBar
                                        label="Expiring soon share"
                                        value={analysis.engagement?.expiringSoonLinks || 0}
                                        total={Math.max(analysis.engagement?.managedLinks || 1, 1)}
                                        colorClass="bg-amber-500"
                                      />
                                      <ProgressBar
                                        label="Expired share"
                                        value={analysis.engagement?.expiredLinks || 0}
                                        total={Math.max(analysis.engagement?.managedLinks || 1, 1)}
                                        colorClass="bg-rose-500"
                                      />
                                    </div>
                                  </div>
                                )}
                                </div>
                              )
                            })()
                          ) : (
                            <p className="mt-4 text-sm text-slate-500">Analysis unavailable for this QR job right now.</p>
                          )}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>

          </>
        )}
      </main>
    </div>
  )
}
