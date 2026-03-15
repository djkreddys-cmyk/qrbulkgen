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
      clearAuthSession()
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
    const confirmed = window.confirm("Delete this QR job and its saved artifact history?")
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
            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
              <StatCard label="Total Jobs" value={summary.totalJobs} />
              <StatCard label="Single Jobs" value={summary.singleJobs} tone="accent" />
              <StatCard label="Bulk Jobs" value={summary.bulkJobs} />
              <StatCard label="Requested" value={summary.totalRequested} />
              <StatCard label="Success" value={summary.totalSuccess} tone="success" />
              <StatCard label="Failure" value={summary.totalFailure} tone="danger" />
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

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900">Created QR Jobs</h2>
                  <p className="mt-1 text-sm text-slate-500">Edit single QR setups, remove old artifacts, and keep active campaigns tidy.</p>
                </div>
              </div>

              {!jobs.length && <p className="mt-5 text-slate-500">No jobs found for the selected dates.</p>}

              {!!jobs.length && (
                <div className="mt-6 grid gap-4">
                  {jobs.map((job) => (
                    <article key={job.id} className="rounded-2xl border border-slate-200 p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                              {job.status}
                            </span>
                            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                              {job.jobType === "single" ? "Single QR" : `${job.qrType} Bulk`}
                            </span>
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
                            {busyJobId === job.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </div>
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
