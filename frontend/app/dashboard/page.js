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
  return params.toString() ? `?${params.toString()}` : ""
}

function StatCard({ label, value, tone = "default" }) {
  const toneClass =
    tone === "success"
      ? "text-emerald-600"
      : tone === "danger"
        ? "text-rose-600"
        : tone === "accent"
          ? "text-sky-700"
          : "text-slate-900"

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className={`mt-3 text-3xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  )
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
          : "bg-slate-100 text-slate-700 border-slate-200"

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneClass}`}>
      {label}
    </span>
  )
}

function BarChart({ title, rows, colorClass = "bg-sky-500", emptyMessage }) {
  const max = Math.max(...rows.map((row) => row.count), 0)

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      {!rows.length && <p className="mt-4 text-sm text-slate-500">{emptyMessage}</p>}
      {!!rows.length && (
        <div className="mt-5 space-y-4">
          {rows.map((row) => (
            <div key={row.label} className="space-y-1">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-slate-700">{row.label}</span>
                <span className="text-slate-500">{row.count}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${colorClass}`}
                  style={{ width: `${max ? Math.max((row.count / max) * 100, 6) : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
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

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [summary, setSummary] = useState(null)
  const [jobs, setJobs] = useState([])
  const [overviewReport, setOverviewReport] = useState(null)
  const [engagementReport, setEngagementReport] = useState(null)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState({ startDate: "", endDate: "" })
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
      const [meData, summaryData, jobsData, overviewData, engagementData] = await Promise.all([
        apiRequest("/auth/me", { headers }),
        apiRequest(`/qr/jobs/summary${activeQuery}`, { headers }),
        apiRequest(`/qr/jobs?limit=12${activeQuery ? `&${activeQuery.slice(1)}` : ""}`, { headers }),
        apiRequest(`/qr/reports/overview${activeQuery}`, { headers }),
        apiRequest(`/qr/reports/public-engagement${activeQuery}`, { headers }),
      ])
      setUser(meData.user)
      setSummary(summaryData.summary)
      setJobs(jobsData.jobs || [])
      setOverviewReport(overviewData.report)
      setEngagementReport(engagementData.report)
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

  async function handleDeleteJob(jobId) {
    const token = getAuthToken()
    if (!token) return
    const confirmed = window.confirm("Archive this QR job? You can keep analytics clean without permanently removing the data.")
    if (!confirmed) return

    try {
      setBusyJobId(jobId)
      await apiRequest(`/qr/jobs/${jobId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
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

  const ratingCharts = engagementReport?.ratings || []
  const feedbackGroups = engagementReport?.feedback || []
  const qrTypePerformance = overviewReport?.qrTypePerformance || []
  const scanSummary = overviewReport?.scanSummary || { totalScans: 0, uniqueScans: 0, repeatedScans: 0, lastScanAt: null }
  const scanTrend = (overviewReport?.scanTrend || []).map((row) => ({ label: row.label, count: row.totalScans }))
  const topPerformingLinks = overviewReport?.topPerformingLinks || []
  const expiringSoon = overviewReport?.expiringSoon || []
  const expiredLinks = overviewReport?.expired || []

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-7xl space-y-8 px-6 py-8">
        <section className="flex flex-col gap-5 rounded-[2rem] border border-slate-200 bg-gradient-to-br from-white to-slate-100 p-8 shadow-sm lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Control Center</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Analytics Dashboard</h1>
            {user && <p className="mt-3 max-w-2xl text-slate-600">Welcome back, {user.name || user.email}. Review created QR jobs, refine active campaigns, and track how rating and feedback QR experiences are performing.</p>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-slate-600">
              Start Date
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900"
              />
            </label>
            <label className="text-sm text-slate-600">
              End Date
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900"
              />
            </label>
            <button
              type="button"
              onClick={() => setFilters({ startDate: "", endDate: "" })}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
            >
              Clear Filters
            </button>
          </div>
        </section>

        {isLoading && <p className="text-slate-600">Loading dashboard...</p>}
        {!isLoading && error && <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">{error}</p>}

        {!isLoading && summary && (
          <>
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900">Created QR Jobs</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Open analysis on any QR job to inspect scan behavior, generation quality, expiry state, rating patterns, and feedback performance in one place.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <MetricPill label="Jobs" value={summary.totalJobs} />
                  <MetricPill label="Bulk" value={summary.bulkJobs} tone="accent" />
                  <MetricPill label="Single" value={summary.singleJobs} />
                  <MetricPill label="Scans" value={scanSummary.totalScans} tone="success" />
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <BarChart
                title="Created QR Types"
                rows={overviewReport?.jobsByQrType || []}
                colorClass="bg-sky-500"
                emptyMessage="No QR jobs found in this date range."
              />
              <BarChart
                title="Job Status Overview"
                rows={overviewReport?.jobsByStatus || []}
                colorClass="bg-emerald-500"
                emptyMessage="No status data available yet."
              />
              <BarChart
                title="Daily Job Volume"
                rows={overviewReport?.dailyJobs || []}
                colorClass="bg-amber-500"
                emptyMessage="No daily activity available yet."
              />
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <BarChart
                title="Scan Trend"
                rows={scanTrend}
                colorClass="bg-indigo-500"
                emptyMessage="No scan activity recorded yet."
              />
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">Top Performing QR Links</h3>
                {!topPerformingLinks.length && <p className="mt-4 text-sm text-slate-500">No managed scan activity yet.</p>}
                {!!topPerformingLinks.length && (
                  <div className="mt-5 space-y-4">
                    {topPerformingLinks.map((link) => (
                      <div key={link.id} className="rounded-2xl bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-900">{link.title}</p>
                            <p className="text-sm text-slate-500">{link.qrType}</p>
                          </div>
                          <MetricPill label="Scans" value={link.totalScans} tone="accent" />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <MetricPill label="Unique" value={link.uniqueScans} />
                          <MetricPill label="Repeated" value={link.repeatedScans} />
                          <MetricPill label="Last Scan" value={link.lastScanAt ? formatCompactDate(link.lastScanAt) : "Not yet"} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">Expiry Watch</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  <MetricPill label="Expiring Soon" value={expiringSoon.length} tone="accent" />
                  <MetricPill label="Expired" value={expiredLinks.length} tone="danger" />
                </div>
                <div className="mt-5 space-y-4">
                  {!!expiringSoon.length && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">Expiring soon</p>
                      <div className="mt-3 space-y-2">
                        {expiringSoon.map((link) => (
                          <div key={link.id} className="rounded-2xl bg-amber-50 p-3 text-sm text-slate-700">
                            <p className="font-medium text-slate-900">{link.title}</p>
                            <p>{link.qrType} • {formatCompactDate(link.expiresAt)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {!!expiredLinks.length && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-600">Expired</p>
                      <div className="mt-3 space-y-2">
                        {expiredLinks.map((link) => (
                          <div key={link.id} className="rounded-2xl bg-rose-50 p-3 text-sm text-slate-700">
                            <p className="font-medium text-slate-900">{link.title}</p>
                            <p>{link.qrType} • {formatCompactDate(link.expiresAt)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {!expiringSoon.length && !expiredLinks.length && (
                    <p className="text-sm text-slate-500">No managed links are close to expiry right now.</p>
                  )}
                </div>
              </section>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              {!jobs.length && <p className="text-slate-500">No jobs found for the selected dates.</p>}

              {!!jobs.length && (
                <div className="grid gap-4">
                  {jobs.map((job) => (
                    <article key={job.id} className="relative overflow-hidden rounded-2xl border border-slate-200 p-5">
                      <div className={`absolute inset-y-0 left-0 w-1.5 ${getStatusAccent(job.status)}`} />
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                              {job.status}
                            </span>
                            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                              {job.jobType === "single" ? "Single QR" : `${job.qrType} Bulk`}
                            </span>
                            {job.status === "completed" && job.successCount > 0 ? (
                              <PerformanceBadge label="Ready to share" tone="success" />
                            ) : null}
                            {job.failureCount > 0 ? (
                              <PerformanceBadge label="Needs review" tone="danger" />
                            ) : null}
                            {job.status === "completed" && job.successCount > 0 && !job.failureCount ? (
                              <PerformanceBadge label="Clean output" tone="success" />
                            ) : null}
                          </div>
                          <p className="font-mono text-xs text-slate-500">{job.id}</p>
                          <div className="grid gap-1 text-sm text-slate-600 sm:grid-cols-2">
                            <p><span className="font-medium text-slate-900">Type:</span> {job.qrType || "-"}</p>
                            <p><span className="font-medium text-slate-900">File:</span> {job.sourceFileName || "-"}</p>
                            <p><span className="font-medium text-slate-900">Requested:</span> {job.totalCount}</p>
                            <p><span className="font-medium text-slate-900">Success / Failure:</span> {job.successCount} / {job.failureCount}</p>
                          </div>
                          {job.errorMessage && <p className="text-sm text-rose-600">{job.errorMessage}</p>}
                        </div>

                        <div className="flex flex-wrap gap-2 lg:justify-end">
                          <button
                            type="button"
                            onClick={() => handleEditJob(job)}
                            className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
                          >
                            {job.jobType === "single" ? "Edit QR" : "Open Bulk"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleAnalysis(job.id)}
                            className="rounded-xl border border-sky-300 px-3 py-2 text-sm font-medium text-sky-700"
                          >
                            {analysisJobId === job.id ? "Hide Analysis" : "Analysis"}
                          </button>
                          {job.artifact?.filePath && (
                            <a
                              className="rounded-xl bg-slate-950 px-3 py-2 text-sm font-medium text-white"
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
                            onClick={() => handleDeleteJob(job.id)}
                            disabled={busyJobId === job.id}
                            className="rounded-xl border border-rose-300 px-3 py-2 text-sm font-medium text-rose-700 disabled:opacity-60"
                          >
                            {busyJobId === job.id ? "Archiving..." : "Archive"}
                          </button>
                        </div>
                      </div>

                      {analysisJobId === job.id && (
                        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
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
                                        className={`rounded-full px-4 py-2 text-sm font-medium ${
                                          active
                                            ? "bg-slate-950 text-white"
                                            : "border border-slate-300 bg-white text-slate-700"
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

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold text-slate-900">QR Type Analysis Reports</h2>
              <p className="mt-1 text-sm text-slate-500">
                Compare how each QR type performs by total jobs, requested rows, successful generations, and failure counts.
              </p>

              {!qrTypePerformance.length && <p className="mt-5 text-slate-500">No QR type analytics available yet.</p>}

              {!!qrTypePerformance.length && (
                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {qrTypePerformance.map((item) => (
                    <article key={item.label} className="rounded-2xl border border-slate-200 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">{item.label}</h3>
                          <p className="mt-1 text-sm text-slate-500">{item.jobsCount} job(s) created</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Success Rate</p>
                          <p className="text-2xl font-semibold text-slate-900">
                            {item.requestedCount
                              ? `${Math.round((item.successCount / item.requestedCount) * 100)}%`
                              : "0%"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2">
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-sky-500"
                            style={{
                              width: `${item.requestedCount
                                ? Math.max((item.successCount / item.requestedCount) * 100, 0)
                                : 0}%`,
                            }}
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <MetricPill label="Requested" value={item.requestedCount} />
                          <MetricPill label="Success" value={item.successCount} tone="success" />
                          <MetricPill label="Failure" value={item.failureCount} tone="danger" />
                          <MetricPill label="Completed Jobs" value={item.completedJobs} tone="accent" />
                          <MetricPill label="Failed Jobs" value={item.failedJobs} tone="danger" />
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-semibold text-slate-900">Rating Analytics</h2>
                <p className="mt-1 text-sm text-slate-500">See how many 5-star and number-based ratings your public QR flows are collecting.</p>

                {!ratingCharts.length && <p className="mt-5 text-slate-500">No rating submissions yet.</p>}
                <div className="mt-6 space-y-6">
                  {ratingCharts.map((item) => (
                    <div key={item.title} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-semibold text-slate-900">{item.title}</h3>
                        <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
                          {item.style === "stars" ? "5 Star Rating" : `Number Rating 1-${item.scale}`}
                        </span>
                      </div>
                      <div className="mt-4 space-y-3">
                        {item.buckets.map((bucket) => {
                          const max = Math.max(...item.buckets.map((entry) => entry.count), 0)
                          return (
                            <div key={bucket.label}>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-700">{bucket.label}</span>
                                <span className="text-slate-500">{bucket.count}</span>
                              </div>
                              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className="h-full rounded-full bg-fuchsia-500"
                                  style={{ width: `${max ? Math.max((bucket.count / max) * 100, 6) : 0}%` }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-semibold text-slate-900">Feedback Question Analysis</h2>
                <p className="mt-1 text-sm text-slate-500">Review responses question by question and skim the latest answers collected from feedback QR pages.</p>

                {!feedbackGroups.length && <p className="mt-5 text-slate-500">No feedback submissions yet.</p>}
                <div className="mt-6 space-y-6">
                  {feedbackGroups.map((group) => (
                    <div key={group.title} className="rounded-2xl border border-slate-200 p-4">
                      <h3 className="font-semibold text-slate-900">{group.title}</h3>
                      <div className="mt-4 space-y-4">
                        {group.questions.map((question) => (
                          <div key={question.label} className="rounded-2xl bg-slate-50 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-medium text-slate-800">{question.label}</p>
                              <span className="text-sm text-slate-500">{question.responses} responses</span>
                            </div>
                            {!!question.latestAnswers.length && (
                              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
                                {question.latestAnswers.map((answer, index) => (
                                  <li key={`${question.label}-${index}`}>{answer}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
