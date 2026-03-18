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

const DASHBOARD_PAGE_SIZE = 10

function PaginationPills({ page, totalPages, totalItems, onChange }) {
  if (totalPages <= 1) return null

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1)

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {pages.map((pageNumber) => {
        const start = (pageNumber - 1) * DASHBOARD_PAGE_SIZE + 1
        const end = Math.min(pageNumber * DASHBOARD_PAGE_SIZE, totalItems)
        const active = pageNumber === page
        return (
          <button
            key={pageNumber}
            type="button"
            onClick={() => onChange(pageNumber)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              active
                ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            {start}-{end}
          </button>
        )
      })}
    </div>
  )
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
  const [selectedJobIds, setSelectedJobIds] = useState([])
  const [shareJob, setShareJob] = useState(null)
  const [exportingReportJobId, setExportingReportJobId] = useState("")
  const [activeWorkspace, setActiveWorkspace] = useState("qr")
  const [shortLinks, setShortLinks] = useState([])
  const [shortLinkFilters, setShortLinkFilters] = useState({ status: "active", activity: "all", startDate: "", endDate: "" })
  const [busyShortLinkId, setBusyShortLinkId] = useState("")
  const [selectedShortLinkIds, setSelectedShortLinkIds] = useState([])
  const [analysisLinkId, setAnalysisLinkId] = useState("")
  const [analysisLoadingLinkId, setAnalysisLoadingLinkId] = useState("")
  const [shortLinkAnalysisById, setShortLinkAnalysisById] = useState({})
  const [exportingShortLinkReportId, setExportingShortLinkReportId] = useState("")
  const [qrPage, setQrPage] = useState(1)
  const [shortLinksPage, setShortLinksPage] = useState(1)

  const queryString = useMemo(() => buildQuery(filters), [filters])

  async function loadData(activeQuery = queryString) {
    const token = getAuthToken()
    if (!token) {
      router.replace("/login")
      return
    }

    try {
      const headers = { Authorization: `Bearer ${token}` }
      const [meData, jobsData, shortLinksData] = await Promise.all([
        apiRequest("/auth/me", { headers }),
        apiRequest(`/qr/jobs?limit=36${activeQuery ? `&${activeQuery.slice(1)}` : ""}`, { headers }),
        apiRequest("/short-links?includeArchived=true", { headers }),
      ])
      setUser(meData.user)
      setJobs(jobsData.jobs || [])
      setShortLinks(shortLinksData.links || [])
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

  useEffect(() => {
    setSelectedJobIds((prev) => prev.filter((id) => jobs.some((job) => job.id === id)))
  }, [jobs])

  useEffect(() => {
    setSelectedShortLinkIds((prev) => prev.filter((id) => shortLinks.some((link) => link.id === id)))
  }, [shortLinks])

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
      setSelectedJobIds((prev) => prev.filter((id) => id !== jobId))
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
    params.set("editJob", job.id)
    router.push(`/generate?${params.toString()}`)
  }

  async function handleBulkArchive() {
    const token = getAuthToken()
    if (!token) return

    const activeSelectedIds = selectedJobIds.filter((id) => {
      const job = jobs.find((entry) => entry.id === id)
      return job && !job.archivedAt
    })

    if (!activeSelectedIds.length) {
      setError("Select at least one active QR job to archive.")
      return
    }

    const confirmed = window.confirm(
      `Archive ${activeSelectedIds.length} selected QR job${activeSelectedIds.length === 1 ? "" : "s"}? They will stay in your current view until refresh, and you can still review them later from the Archived filter.`,
    )

    if (!confirmed) return

    try {
      setBusyJobId("bulk-archive")
      await Promise.all(
        activeSelectedIds.map((jobId) =>
          apiRequest(`/qr/jobs/${jobId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          }),
        ),
      )
      setSelectedJobIds([])
      await loadData(queryString)
      setError("")
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusyJobId("")
    }
  }

  async function handleBulkDelete() {
    const token = getAuthToken()
    if (!token) return

    const archivedSelectedIds = selectedJobIds.filter((id) => {
      const job = jobs.find((entry) => entry.id === id)
      return job && job.archivedAt
    })

    if (!archivedSelectedIds.length) {
      setError("Select at least one archived QR job to delete permanently.")
      return
    }

    const confirmed = window.confirm(
      `Delete ${archivedSelectedIds.length} archived QR job${archivedSelectedIds.length === 1 ? "" : "s"} permanently?`,
    )
    if (!confirmed) return

    try {
      setBusyJobId("bulk-delete")
      await Promise.all(
        archivedSelectedIds.map((jobId) =>
          apiRequest(`/qr/jobs/${jobId}?force=true`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          }),
        ),
      )
      setSelectedJobIds((prev) => prev.filter((id) => !archivedSelectedIds.includes(id)))
      await loadData(queryString)
      setError("")
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusyJobId("")
    }
  }

  function handleBulkDownload() {
    const downloadableJobs = selectedJobs.filter((job) => job.artifact?.filePath)
    if (!downloadableJobs.length) {
      setError("Select at least one QR job with a downloadable artifact.")
      return
    }

    downloadableJobs.forEach((job, index) => {
      const href = toAbsoluteDownloadUrl(job.artifact.filePath)
      window.setTimeout(() => {
        const link = document.createElement("a")
        link.href = href
        link.download = job.artifact?.fileName || undefined
        if (!String(job.artifact.filePath).startsWith("data:")) {
          link.target = "_blank"
          link.rel = "noreferrer"
        }
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }, index * 180)
    })
  }

  function toggleSelectedJob(jobId) {
    setSelectedJobIds((prev) => (prev.includes(jobId) ? prev.filter((id) => id !== jobId) : [...prev, jobId]))
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

  const qrTotalPages = Math.max(Math.ceil(filteredJobs.length / DASHBOARD_PAGE_SIZE), 1)
  const paginatedJobs = useMemo(() => {
    const start = (qrPage - 1) * DASHBOARD_PAGE_SIZE
    return filteredJobs.slice(start, start + DASHBOARD_PAGE_SIZE)
  }, [filteredJobs, qrPage])

  const selectedJobs = useMemo(() => jobs.filter((job) => selectedJobIds.includes(job.id)), [jobs, selectedJobIds])
  const activeSelectedCount = selectedJobs.filter((job) => !job.archivedAt).length
  const archivedSelectedCount = selectedJobs.filter((job) => job.archivedAt).length
  const downloadableSelectedCount = selectedJobs.filter((job) => job.artifact?.filePath).length
  const allFilteredSelected = paginatedJobs.length > 0 && paginatedJobs.every((job) => selectedJobIds.includes(job.id))

  function toggleSelectAllFiltered() {
    if (allFilteredSelected) {
      setSelectedJobIds((prev) => prev.filter((id) => !paginatedJobs.some((job) => job.id === id)))
      return
    }
    setSelectedJobIds((prev) => Array.from(new Set([...prev, ...paginatedJobs.map((job) => job.id)])))
  }

  const filteredShortLinks = useMemo(() => {
    return shortLinks.filter((link) => {
      const archived = Boolean(link.archivedAt)
      const expired = isExpiredLink(link)
      const createdAt = link.createdAt ? new Date(link.createdAt) : null

      if (shortLinkFilters.status === "active" && archived) return false
      if (shortLinkFilters.status === "archived" && !archived) return false
      if (shortLinkFilters.status === "expired" && !expired) return false
      if (shortLinkFilters.status === "expiring" && !isExpiringSoonLink(link)) return false

      if (shortLinkFilters.activity === "clicked" && Number(link.clickCount || 0) <= 0) return false
      if (shortLinkFilters.activity === "unclicked" && Number(link.clickCount || 0) > 0) return false

      if (shortLinkFilters.startDate && createdAt && !Number.isNaN(createdAt.getTime())) {
        const start = new Date(`${shortLinkFilters.startDate}T00:00:00`)
        if (createdAt < start) return false
      }

      if (shortLinkFilters.endDate && createdAt && !Number.isNaN(createdAt.getTime())) {
        const end = new Date(`${shortLinkFilters.endDate}T23:59:59.999`)
        if (createdAt > end) return false
      }

      return true
    })
  }, [shortLinks, shortLinkFilters])

  const shortLinksTotalPages = Math.max(Math.ceil(filteredShortLinks.length / DASHBOARD_PAGE_SIZE), 1)
  const paginatedShortLinks = useMemo(() => {
    const start = (shortLinksPage - 1) * DASHBOARD_PAGE_SIZE
    return filteredShortLinks.slice(start, start + DASHBOARD_PAGE_SIZE)
  }, [filteredShortLinks, shortLinksPage])

  useEffect(() => {
    setQrPage(1)
  }, [filters, activeWorkspace])

  useEffect(() => {
    setShortLinksPage(1)
  }, [shortLinkFilters, activeWorkspace])

  useEffect(() => {
    if (qrPage > qrTotalPages) {
      setQrPage(qrTotalPages)
    }
  }, [qrPage, qrTotalPages])

  useEffect(() => {
    if (shortLinksPage > shortLinksTotalPages) {
      setShortLinksPage(shortLinksTotalPages)
    }
  }, [shortLinksPage, shortLinksTotalPages])

  const selectedShortLinks = useMemo(
    () => shortLinks.filter((link) => selectedShortLinkIds.includes(link.id)),
    [shortLinks, selectedShortLinkIds],
  )
  const activeSelectedShortLinkCount = selectedShortLinks.filter((link) => !link.archivedAt).length
  const archivedSelectedShortLinkCount = selectedShortLinks.filter((link) => link.archivedAt).length
  const allFilteredShortLinksSelected =
    paginatedShortLinks.length > 0 && paginatedShortLinks.every((link) => selectedShortLinkIds.includes(link.id))

  function toggleSelectedShortLink(linkId) {
    setSelectedShortLinkIds((prev) => (prev.includes(linkId) ? prev.filter((id) => id !== linkId) : [...prev, linkId]))
  }

  function toggleSelectAllFilteredShortLinks() {
    if (allFilteredShortLinksSelected) {
      setSelectedShortLinkIds((prev) => prev.filter((id) => !paginatedShortLinks.some((link) => link.id === id)))
      return
    }

    setSelectedShortLinkIds((prev) => Array.from(new Set([...prev, ...paginatedShortLinks.map((link) => link.id)])))
  }

  function getShareUrl(job) {
    if (job?.trackingMode === "tracked" && job?.managedLink?.id && typeof window !== "undefined") {
      return `${window.location.origin}/q/${job.managedLink.id}`
    }

    const directContent = String(job?.editPayload?.content || "").trim()
    if (directContent) {
      return directContent
    }

    return job?.artifact?.filePath ? toAbsoluteDownloadUrl(job.artifact.filePath) : ""
  }

  async function handleShareQrImage(job) {
    const artifactUrl = job?.artifact?.filePath ? toAbsoluteDownloadUrl(job.artifact.filePath) : ""
    if (!artifactUrl) {
      setError("No QR image is available for sharing.")
      return
    }
    if (!navigator?.share) {
      setError("Sharing is not supported in this browser. Use Download instead.")
      return
    }

    try {
      const response = await fetch(artifactUrl)
      const blob = await response.blob()
      const file = new File([blob], job?.artifact?.fileName || `${(job?.qrType || "qr").toLowerCase()}-qr.png`, {
        type: blob.type || "image/png",
      })

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: getJobTitle(job),
          text: `Sharing ${job.qrType || "QR"} from QRBulkGen`,
          files: [file],
        })
      } else {
        await navigator.share({
          title: getJobTitle(job),
          text: `Check this QR from QRBulkGen: ${getShareUrl(job)}`,
          url: getShareUrl(job),
        })
      }
      setShareJob(null)
    } catch (shareError) {
      if (shareError?.name === "AbortError") return
      setError(shareError.message || "Failed to share QR image.")
    }
  }

  async function handleDownloadAnalysisReport(job) {
    const token = getAuthToken()
    if (!token) {
      router.replace("/login")
      return
    }

    try {
      setExportingReportJobId(job.id)
      const response = await fetch(`${API_BASE_URL}/qr/jobs/${job.id}/analysis-report.csv`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error?.message || "Failed to download analysis report")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      const safeType = String(job.qrType || "qr").replace(/[^a-z0-9]+/gi, "-").toLowerCase()
      link.href = url
      link.download = `${safeType || "qr"}-analysis-report-${job.id}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (downloadError) {
      setError(downloadError.message || "Failed to download analysis report.")
    } finally {
      setExportingReportJobId("")
    }
  }

  async function handleDownloadShortLinkAnalysisReport(link) {
    const token = getAuthToken()
    if (!token) {
      router.replace("/login")
      return
    }

    try {
      setExportingShortLinkReportId(link.id)
      const response = await fetch(`${API_BASE_URL}/short-links/${link.id}/analysis-report.csv`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error?.message || "Failed to download short link analysis report")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const downloadLink = document.createElement("a")
      const safeTitle = String(link.title || link.slug || "short-link").replace(/[^a-z0-9]+/gi, "-").toLowerCase()
      downloadLink.href = url
      downloadLink.download = `${safeTitle || "short-link"}-analysis-report-${link.id}.csv`
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)
      window.URL.revokeObjectURL(url)
    } catch (downloadError) {
      setError(downloadError.message || "Failed to download short link analysis report.")
    } finally {
      setExportingShortLinkReportId("")
    }
  }

  async function copyShortLink(url) {
    try {
      await navigator.clipboard.writeText(url)
      setError("")
    } catch {
      setError("Unable to copy short URL.")
    }
  }

  async function handleDeleteShortLink(link) {
    const token = getAuthToken()
    if (!token) {
      router.replace("/login")
      return
    }

    const force = Boolean(link.archivedAt)
    const confirmed = window.confirm(
      force ? "Permanently delete this short URL?" : "Archive this short URL? You can still review it later.",
    )
    if (!confirmed) return

    try {
      setBusyShortLinkId(link.id)
      await apiRequest(`/short-links/${link.id}${force ? "?force=true" : ""}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      setSelectedShortLinkIds((prev) => prev.filter((id) => id !== link.id))
      await loadData(queryString)
      setError("")
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusyShortLinkId("")
    }
  }

  async function handleToggleShortLinkAnalysis(linkId) {
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

    if (shortLinkAnalysisById[linkId]) {
      return
    }

    try {
      setAnalysisLoadingLinkId(linkId)
      const data = await apiRequest(`/short-links/${linkId}/analysis`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setShortLinkAnalysisById((prev) => ({
        ...prev,
        [linkId]: data.analysis,
      }))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setAnalysisLoadingLinkId("")
    }
  }

  async function handleBulkArchiveShortLinks() {
    const token = getAuthToken()
    if (!token) return

    const activeSelected = selectedShortLinks.filter((link) => !link.archivedAt)
    if (!activeSelected.length) {
      setError("Select at least one active short URL to archive.")
      return
    }

    const confirmed = window.confirm(`Archive ${activeSelected.length} selected short URL${activeSelected.length === 1 ? "" : "s"}?`)
    if (!confirmed) return

    try {
      setBusyShortLinkId("bulk-archive")
      await Promise.all(
        activeSelected.map((link) =>
          apiRequest(`/short-links/${link.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          }),
        ),
      )
      setSelectedShortLinkIds((prev) => prev.filter((id) => !activeSelected.some((link) => link.id === id)))
      await loadData(queryString)
      setError("")
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusyShortLinkId("")
    }
  }

  async function handleBulkDeleteShortLinks() {
    const token = getAuthToken()
    if (!token) return

    const archivedSelected = selectedShortLinks.filter((link) => link.archivedAt)
    if (!archivedSelected.length) {
      setError("Select at least one archived short URL to delete.")
      return
    }

    const confirmed = window.confirm(`Delete ${archivedSelected.length} archived short URL${archivedSelected.length === 1 ? "" : "s"} permanently?`)
    if (!confirmed) return

    try {
      setBusyShortLinkId("bulk-delete")
      await Promise.all(
        archivedSelected.map((link) =>
          apiRequest(`/short-links/${link.id}?force=true`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          }),
        ),
      )
      setSelectedShortLinkIds((prev) => prev.filter((id) => !archivedSelected.some((link) => link.id === id)))
      await loadData(queryString)
      setError("")
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusyShortLinkId("")
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-[112rem] px-4 py-6 md:px-6 xl:px-8">
        <div className="grid gap-6 xl:grid-cols-[15rem_minmax(0,1fr)]">
          <aside className="hidden xl:block">
            <div className="sticky top-24 space-y-4">
              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Workspace</p>
                <div className="mt-4 grid gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveWorkspace("qr")}
                    className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${activeWorkspace === "qr" ? "border-slate-300 bg-slate-50 text-slate-900 shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"}`}
                  >
                    QR Dashboard
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveWorkspace("short-links")}
                    className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${activeWorkspace === "short-links" ? "border-sky-200 bg-sky-50 text-sky-700 shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"}`}
                  >
                    Short Links
                  </button>
                </div>
              </div>
            </div>
          </aside>

          <div className="space-y-6">
        <div className="flex flex-wrap gap-3 xl:hidden">
          <button
            type="button"
            onClick={() => setActiveWorkspace("qr")}
            className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${activeWorkspace === "qr" ? "border-slate-300 bg-slate-50 text-slate-900 shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"}`}
          >
            QR Dashboard
          </button>
          <button
            type="button"
            onClick={() => setActiveWorkspace("short-links")}
            className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${activeWorkspace === "short-links" ? "border-sky-200 bg-sky-50 text-sky-700 shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"}`}
          >
            Short Links
          </button>
        </div>
        <>
            <section id="qr-dashboard" className={`flex flex-col gap-5 rounded-[2rem] border border-slate-200 bg-gradient-to-br from-white to-slate-100 p-8 shadow-sm lg:flex-row lg:items-end lg:justify-between${activeWorkspace !== "qr" ? " hidden" : ""}`}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Control Center</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Analytics Dashboard</h1>
            {user && <p className="mt-3 max-w-4xl text-slate-600">Welcome back, {user.name || user.email}. Open analysis on any created QR to inspect generation quality, scan behavior, response depth, and expiry health in one focused dashboard.</p>}
          </div>
            </section>

            <section className={`overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm${activeWorkspace !== "qr" ? " hidden" : ""}`}>
          <div className="sticky top-20 z-20 border-b border-slate-200 bg-white/95 px-4 pt-4 pb-3 backdrop-blur">
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
          </div>
          <div className="px-4 py-4 text-xs text-slate-500">
            Archived QR jobs appear when Status is set to <span className="font-semibold text-slate-700">Archived</span> or <span className="font-semibold text-slate-700">All</span>. Archived rows show a <span className="font-semibold text-slate-700">Delete Permanently</span> action.
          </div>
        </section>

        {activeWorkspace === "qr" && isLoading && <p className="text-slate-600">Loading dashboard...</p>}
        {activeWorkspace === "qr" && !isLoading && error && <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">{error}</p>}

        {activeWorkspace === "qr" && !isLoading && (
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
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-sm text-slate-600">
                        <input
                            type="checkbox"
                            checked={allFilteredSelected}
                            onChange={toggleSelectAllFiltered}
                            className="h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-sky-200"
                          />
                        <span>Select page</span>
                      </label>
                      <p className="text-sm text-slate-600">
                        <span className="font-semibold text-slate-900">{selectedJobIds.length}</span> job{selectedJobIds.length === 1 ? "" : "s"} selected
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <PaginationPills page={qrPage} totalPages={qrTotalPages} totalItems={filteredJobs.length} onChange={setQrPage} />
                      {!!selectedJobIds.length && (
                        <>
                        <button
                          type="button"
                          onClick={handleBulkDownload}
                          disabled={!downloadableSelectedCount}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Download selected{downloadableSelectedCount ? ` (${downloadableSelectedCount})` : ""}
                        </button>
                        <button
                          type="button"
                          onClick={handleBulkArchive}
                          disabled={!activeSelectedCount || busyJobId === "bulk-archive"}
                          className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700 shadow-sm transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Archive selected{activeSelectedCount ? ` (${activeSelectedCount})` : ""}
                        </button>
                        <button
                          type="button"
                          onClick={handleBulkDelete}
                          disabled={!archivedSelectedCount || busyJobId === "bulk-delete"}
                          className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700 shadow-sm transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Delete selected{archivedSelectedCount ? ` (${archivedSelectedCount})` : ""}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedJobIds([])}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300"
                        >
                          Clear selection
                        </button>
                        </>
                      )}
                    </div>
                  </div>
                  {paginatedJobs.map((job) => (
                    <article key={job.id} className="group relative overflow-hidden rounded-[1.9rem] border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/60 md:p-6">
                      <div className={`absolute inset-y-0 left-0 w-1.5 ${getStatusAccent(job.status)}`} />
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex items-start gap-4">
                          <label className="mt-2 flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center">
                            <input
                              type="checkbox"
                              checked={selectedJobIds.includes(job.id)}
                              onChange={() => toggleSelectedJob(job.id)}
                              className="h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-sky-200"
                            />
                          </label>
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
                            <PerformanceBadge label={job.trackingMode === "direct" ? "Direct" : "Tracked"} tone={job.trackingMode === "direct" ? "neutral" : "accent"} />
                            {job.archivedAt ? <PerformanceBadge label="Archived" tone="warning" /> : null}
                            {job.failureCount > 0 ? (
                              <PerformanceBadge label="Needs review" tone="danger" />
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

                        <div className="flex flex-wrap items-center gap-2 lg:max-w-[42rem] lg:flex-nowrap lg:justify-end">
                          <button
                            type="button"
                            onClick={() => handleEditJob(job)}
                            className="rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow"
                          >
                            {job.jobType === "single" ? "Edit QR" : "Open Bulk"}
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
                          {job.trackingMode !== "direct" ? (
                            <button
                              type="button"
                              onClick={() => handleToggleAnalysis(job.id)}
                              className="rounded-2xl border border-sky-200 bg-sky-50 px-3.5 py-2.5 text-sm font-semibold text-sky-700 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:bg-white"
                            >
                              {analysisJobId === job.id ? "Hide Analysis" : "Analysis"}
                            </button>
                          ) : null}
                          {job.status === "completed" && job.successCount > 0 ? (
                            <button
                              type="button"
                              onClick={() => setShareJob(job)}
                              className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-white"
                            >
                              Ready to share
                            </button>
                          ) : null}
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
                              const lifetime = analysis.lifetimeEngagement || analysis.engagement || {}
                              const current = analysis.currentEngagement || analysis.engagement || {}
                              const lifetimeScans = lifetime.totalScans || 0
                              const lifetimeUnique = lifetime.uniqueScans || 0
                              const lifetimeRepeated = lifetime.repeatedScans || 0
                              const lifetimeSubmissions = lifetime.totalSubmissions || 0
                              const currentScans = current.totalScans || 0
                              const currentUnique = current.uniqueScans || 0
                              const currentRepeated = current.repeatedScans || 0
                              const currentSubmissions = current.totalSubmissions || 0
                              const hasTrackedEngagement = Boolean(analysis.engagement?.trackingEnabled)
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

                                {job.trackingMode !== "tracked" && (currentTab === "overview" || currentTab === "scans") && (
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
                                      <p className="mt-1 text-sm text-slate-500">
                                        {hasTrackedEngagement
                                          ? "See both total history and the latest updated-version activity for this QR."
                                          : "Tracking is unavailable for this QR right now."}
                                      </p>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-end gap-2">
                                      {hasTrackedEngagement ? (
                                        <button
                                          type="button"
                                          onClick={() => handleDownloadAnalysisReport(job)}
                                          disabled={exportingReportJobId === job.id}
                                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                          {exportingReportJobId === job.id ? "Preparing Excel..." : "Download Excel"}
                                        </button>
                                      ) : null}
                                      <MetricPill
                                        label="Tracking"
                                        value={hasTrackedEngagement ? "Active" : "Unavailable"}
                                        tone={hasTrackedEngagement ? "success" : "default"}
                                      />
                                    </div>
                                  </div>
                                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Overall History</p>
                                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                                        <AnalysisStat label="Scans" value={lifetimeScans} />
                                        <AnalysisStat label="Unique" value={lifetimeUnique} tone="accent" />
                                        <AnalysisStat label="Repeated" value={lifetimeRepeated} />
                                        <AnalysisStat label="Submissions" value={lifetimeSubmissions} tone="success" />
                                      </div>
                                    </div>
                                    <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
                                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Latest Updated Version</p>
                                      <p className="mt-1 text-xs text-slate-500">
                                        {current.versionStartedAt ? `Counts from ${formatDateTime(current.versionStartedAt)}` : "Counts for the latest saved version."}
                                      </p>
                                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                                        <AnalysisStat label="Scans" value={currentScans} />
                                        <AnalysisStat label="Unique" value={currentUnique} tone="accent" />
                                        <AnalysisStat label="Repeated" value={currentRepeated} />
                                        <AnalysisStat label="Submissions" value={currentSubmissions} tone="success" />
                                      </div>
                                    </div>
                                  </div>
                                  {hasTrackedEngagement ? (
                                    <p className="mt-3 text-xs text-slate-500">
                                      Excel export includes scan date, scan time, destination/output, IP, visitor key, and any stored location metadata.
                                    </p>
                                  ) : null}
                                  <div className="mt-4 space-y-3">
                                    <ProgressBar
                                      label="Unique visitor share"
                                      value={currentUnique}
                                      total={Math.max(currentScans, 1)}
                                      colorClass="bg-sky-500"
                                      helper={currentScans ? `${Math.round((currentUnique / currentScans) * 100)}%` : "0%"}
                                    />
                                    <ProgressBar
                                      label="Repeat visitor share"
                                      value={currentRepeated}
                                      total={Math.max(currentScans, 1)}
                                      colorClass="bg-violet-500"
                                      helper={currentScans ? `${Math.round((currentRepeated / currentScans) * 100)}%` : "0%"}
                                    />
                                  </div>
                                  <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                                    <p>
                                      <span className="font-medium text-slate-900">Last scan:</span>{" "}
                                      {formatDateTime(current.lastScanAt)}
                                    </p>
                                    <p>
                                      <span className="font-medium text-slate-900">Last submission:</span>{" "}
                                      {formatDateTime(current.lastSubmissionAt)}
                                    </p>
                                    <p>
                                      <span className="font-medium text-slate-900">Tracking mode:</span>{" "}
                                      {current.trackingMode === "managed-redirect" ? "Managed redirect" : "Direct / device handled"}
                                    </p>
                                    <p>
                                      <span className="font-medium text-slate-900">Expiry date:</span>{" "}
                                      {current.expiryDate ? formatDateTime(current.expiryDate) : "Not set"}
                                    </p>
                                    <p>
                                      <span className="font-medium text-slate-900">Engagement type:</span>{" "}
                                      {current.targetKind || job.qrType || "Direct QR"}
                                    </p>
                                    <p>
                                      <span className="font-medium text-slate-900">Expiring soon:</span>{" "}
                                      {current.expiringSoonLinks || 0}
                                    </p>
                                    <p>
                                      <span className="font-medium text-slate-900">Expired links:</span>{" "}
                                      {current.expiredLinks || 0}
                                    </p>
                                  </div>
                                </div>
                                )}

                                {(currentTab === "overview" || currentTab === "scans") && (
                                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                      <div className="flex items-center justify-between gap-3">
                                        <div>
                                          <p className="font-medium text-slate-900">Scan trend</p>
                                          <p className="mt-1 text-sm text-slate-500">
                                            {lifetimeScans > currentScans
                                              ? "Latest-version trend is shown here. Overall history remains in the usage totals above."
                                              : "Recent scan activity for this QR job."}
                                          </p>
                                        </div>
                                        <MetricPill label="Points" value={scanTrendPoints.length} tone="accent" />
                                      </div>
                                      <div className="mt-4">
                                        <Sparkline points={scanTrendPoints} />
                                      </div>
                                    </div>

                                    {currentTab === "overview" ? (
                                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                        <p className="font-medium text-slate-900">Actionable Insights</p>
                                        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
                                          {!hasTrackedEngagement ? <li>Tracking is unavailable for this QR right now.</li> : null}
                                          {extraInsights.map((insight, index) => (
                                            <li key={`${job.id}-insight-${index}`}>{insight}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    ) : (
                                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                        <p className="font-medium text-slate-900">History Note</p>
                                        <div className="mt-3 space-y-2 text-sm text-slate-600">
                                          <p>
                                            <span className="font-medium text-slate-900">Overall history:</span> {lifetimeScans} scan{lifetimeScans === 1 ? "" : "s"} and {lifetimeSubmissions} submission{lifetimeSubmissions === 1 ? "" : "s"}.
                                          </p>
                                          <p>
                                            <span className="font-medium text-slate-900">Latest version:</span> {currentScans} scan{currentScans === 1 ? "" : "s"} and {currentSubmissions} submission{currentSubmissions === 1 ? "" : "s"}.
                                          </p>
                                          <p>
                                            The totals above keep your previous scans, while the latest-version card isolates activity after the most recent update.
                                          </p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {job.trackingMode !== "tracked" && analysis.typePerformance && (currentTab === "overview" || currentTab === "scans") && (
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
                                    <p className="mt-1 text-sm text-slate-500">Counts and percentage share for each rating option.</p>
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
                                    <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                      <p className="font-medium text-slate-900">Rating percentage share</p>
                                      <div className="mt-3 space-y-3">
                                        {analysis.rating.buckets.map((bucket) => {
                                          const totalRatings = Math.max(
                                            analysis.rating.buckets.reduce((sum, entry) => sum + (entry.count || 0), 0),
                                            1,
                                          )
                                          const percent = Math.round(((bucket.count || 0) / totalRatings) * 100)
                                          return (
                                            <div key={`${bucket.label}-percent`}>
                                              <div className="flex items-center justify-between text-sm">
                                                <span className="text-slate-700">Rating {bucket.label}</span>
                                                <span className="text-slate-500">{percent}%</span>
                                              </div>
                                              <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-100">
                                                <div
                                                  className="h-full rounded-full bg-sky-500"
                                                  style={{ width: `${Math.max(percent, bucket.count ? 6 : 0)}%` }}
                                                />
                                              </div>
                                            </div>
                                          )
                                        })}
                                      </div>
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
        )}
        </>

        <div className={activeWorkspace === "short-links" ? "" : "hidden"}>
            <section className="mb-6 flex flex-col gap-5 rounded-[2rem] border border-slate-200 bg-gradient-to-br from-white to-slate-100 p-8 shadow-sm lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Control Center</p>
                <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Short Links Dashboard</h1>
                {user && <p className="mt-3 max-w-4xl text-slate-600">Welcome back, {user.name || user.email}. Open analysis on each saved short URL to review clicks, visitors, expiry status, and related link performance in one focused dashboard.</p>}
              </div>
            </section>
            <section id="short-links-dashboard" className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-white px-4 pt-4 pb-3">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
                  <label className="text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-500 xl:min-w-[11rem]">
                    Status
                    <select
                      value={shortLinkFilters.status}
                      onChange={(e) => setShortLinkFilters((prev) => ({ ...prev, status: e.target.value }))}
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
                      value={shortLinkFilters.activity}
                      onChange={(e) => setShortLinkFilters((prev) => ({ ...prev, activity: e.target.value }))}
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
                      value={shortLinkFilters.startDate}
                      onChange={(e) => setShortLinkFilters((prev) => ({ ...prev, startDate: e.target.value }))}
                      className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[15px] text-slate-900 shadow-sm outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
                    />
                  </label>
                  <label className="text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-500 xl:min-w-[10rem]">
                    End Date
                    <input
                      type="date"
                      value={shortLinkFilters.endDate}
                      onChange={(e) => setShortLinkFilters((prev) => ({ ...prev, endDate: e.target.value }))}
                      className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[15px] text-slate-900 shadow-sm outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setShortLinkFilters({ status: "active", activity: "all", startDate: "", endDate: "" })}
                    className="h-12 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
              <div className="px-4 py-4 text-xs text-slate-500">
                Short URL analytics and saved-link management are now available on the dashboard. Create new short URLs from the Generate screen and review them here.
              </div>

              <div className="rounded-3xl bg-white p-5 shadow-sm md:p-6">
                {isLoading ? <p className="text-slate-600">Loading short links...</p> : null}
                {!isLoading && error ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">{error}</p> : null}
                {!isLoading && !error && !filteredShortLinks.length ? (
                  <EmptyState
                    title="No short URLs found"
                    body="Create a short URL from the Generate screen, then come back here to review visits, expiry, and analytics."
                  />
                ) : null}
                {!isLoading && !error && !!filteredShortLinks.length ? (
                  <div className="grid gap-5">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-sm text-slate-600">
                          <input
                            type="checkbox"
                            checked={allFilteredShortLinksSelected}
                            onChange={toggleSelectAllFilteredShortLinks}
                            className="h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-sky-200"
                          />
                          <span>Select page</span>
                        </label>
                        <p className="text-sm text-slate-600">
                          <span className="font-semibold text-slate-900">{selectedShortLinkIds.length}</span> link{selectedShortLinkIds.length === 1 ? "" : "s"} selected
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <PaginationPills page={shortLinksPage} totalPages={shortLinksTotalPages} totalItems={filteredShortLinks.length} onChange={setShortLinksPage} />
                        {!!selectedShortLinkIds.length && (
                          <>
                          <button
                            type="button"
                            onClick={handleBulkArchiveShortLinks}
                            disabled={!activeSelectedShortLinkCount || busyShortLinkId === "bulk-archive"}
                            className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm font-semibold text-amber-700 shadow-sm transition hover:border-amber-300 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Archive selected{activeSelectedShortLinkCount ? ` (${activeSelectedShortLinkCount})` : ""}
                          </button>
                          <button
                            type="button"
                            onClick={handleBulkDeleteShortLinks}
                            disabled={!archivedSelectedShortLinkCount || busyShortLinkId === "bulk-delete"}
                            className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700 shadow-sm transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Delete selected{archivedSelectedShortLinkCount ? ` (${archivedSelectedShortLinkCount})` : ""}
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedShortLinkIds([])}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300"
                          >
                            Clear selection
                          </button>
                          </>
                        )}
                      </div>
                    </div>

                    {paginatedShortLinks.map((link) => (
                      <article key={link.id} className={`group relative overflow-hidden rounded-[1.9rem] border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/60 ${Number(link.clickCount || 0) > 0 || analysisLinkId === link.id ? "p-5 md:p-6" : "p-4 md:p-5"}`}>
                        <div className={`absolute inset-y-0 left-0 w-1.5 ${link.archivedAt ? "bg-amber-500" : isExpiredLink(link) ? "bg-rose-500" : Number(link.clickCount || 0) > 0 ? "bg-sky-500" : "bg-slate-300"}`} />
                        <div className={`flex flex-col lg:flex-row lg:items-start lg:justify-between ${Number(link.clickCount || 0) > 0 || analysisLinkId === link.id ? "gap-5" : "gap-4"}`}>
                          <div className="flex items-start gap-4">
                            <label className="mt-2 flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center">
                              <input
                                type="checkbox"
                                checked={selectedShortLinkIds.includes(link.id)}
                                onChange={() => toggleSelectedShortLink(link.id)}
                                className="h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-sky-200"
                              />
                            </label>
                            <div className="space-y-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${link.archivedAt ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                                  {link.archivedAt ? "Archived" : "Active"}
                                </span>
                                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${Number(link.clickCount || 0) > 0 ? "bg-sky-50 text-sky-700" : "bg-slate-100 text-slate-500"}`}>
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
                                <p><span className="font-medium text-slate-900">Created:</span> {formatDateTime(link.createdAt)}</p>
                                <p><span className="font-medium text-slate-900">Last visit:</span> {formatDateTime(link.lastVisitedAt)}</p>
                                <p><span className="font-medium text-slate-900">Expiry:</span> {formatDateTime(link.expiresAt)}</p>
                                <p><span className="font-medium text-slate-900">Slug:</span> {link.slug}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2.5 lg:max-w-[34rem] lg:justify-end">
                            <button type="button" onClick={() => copyShortLink(link.url)} className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow">
                              Copy
                            </button>
                            <button type="button" onClick={() => handleToggleShortLinkAnalysis(link.id)} className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-700 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:bg-white hover:shadow">
                              {analysisLinkId === link.id ? "Hide Analysis" : "Analysis"}
                            </button>
                            <a href={link.url} target="_blank" rel="noreferrer" className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow">
                              Open
                            </a>
                            <button
                              type="button"
                              onClick={() => handleDeleteShortLink(link)}
                              disabled={busyShortLinkId === link.id}
                              className={`rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow disabled:cursor-not-allowed disabled:opacity-50 ${link.archivedAt ? "border border-rose-200 text-rose-700 hover:border-rose-300 hover:bg-rose-50" : "border border-amber-200 text-amber-700 hover:border-amber-300 hover:bg-amber-50"}`}
                            >
                              {link.archivedAt ? "Delete Permanently" : "Archive"}
                            </button>
                          </div>
                        </div>

                        {analysisLinkId === link.id ? (
                          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                            {analysisLoadingLinkId === link.id ? (
                              <p className="text-sm text-slate-500">Loading analysis...</p>
                            ) : shortLinkAnalysisById[link.id] ? (
                              <div className="space-y-5">
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                  <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Short Link Analytics</p>
                                    <h4 className="mt-2 text-xl font-semibold text-slate-950">{link.title || link.slug}</h4>
                                    <p className="mt-1 text-sm text-slate-500">Analysis has been moved to the dashboard so QR and short URL reporting stay in one workspace.</p>
                                  </div>
                                  <div className="flex flex-wrap items-start justify-end gap-3">
                                    <button
                                      type="button"
                                      onClick={() => handleDownloadShortLinkAnalysisReport(link)}
                                      disabled={exportingShortLinkReportId === link.id}
                                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      {exportingShortLinkReportId === link.id ? "Preparing Excel..." : "Download Excel"}
                                    </button>
                                    <div className="max-w-sm rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-slate-700">
                                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">Quick Insight</p>
                                      <p className="mt-2 leading-6">{shortLinkAnalysisById[link.id].quickInsight}</p>
                                    </div>
                                  </div>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                  <AnalysisStat label="Total Visits" value={shortLinkAnalysisById[link.id].totalVisits} tone="accent" />
                                  <AnalysisStat label="Unique Visits" value={shortLinkAnalysisById[link.id].uniqueVisits} tone="success" />
                                  <AnalysisStat label="Repeat Visits" value={shortLinkAnalysisById[link.id].repeatVisits} />
                                  <AnalysisStat
                                    label="Expiry State"
                                    value={shortLinkAnalysisById[link.id].isExpired ? "Expired" : shortLinkAnalysisById[link.id].expiresAt ? "Scheduled" : "Open"}
                                    tone={shortLinkAnalysisById[link.id].isExpired ? "danger" : "default"}
                                  />
                                </div>

                                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                                    <h4 className="text-base font-semibold text-slate-950">Visit breakdown</h4>
                                    <div className="mt-4 space-y-4">
                                      <ProgressBar
                                        label="Unique visitors"
                                        value={shortLinkAnalysisById[link.id].uniqueVisits}
                                        total={Math.max(shortLinkAnalysisById[link.id].totalVisits, 1)}
                                        colorClass="bg-sky-500"
                                      />
                                      <ProgressBar
                                        label="Repeat visits"
                                        value={shortLinkAnalysisById[link.id].repeatVisits}
                                        total={Math.max(shortLinkAnalysisById[link.id].totalVisits, 1)}
                                        colorClass="bg-emerald-500"
                                      />
                                    </div>
                                  </div>

                                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                                    <h4 className="text-base font-semibold text-slate-950">7-day trend</h4>
                                    <div className="mt-4">
                                      <Sparkline points={shortLinkAnalysisById[link.id].trend || []} />
                                    </div>
                                  </div>
                                </div>
                                <p className="text-xs text-slate-500">
                                  Excel export now matches the QR analysis sheet format with scan date, response, output type, title, and stored location metadata.
                                </p>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </article>
                    ))}
                  </div>
                ) : null}
              </div>
            </section>
        </div>
        {shareJob ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Share QR</p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-950">{getJobTitle(shareJob)}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Use the QR image share sheet to send this QR through the apps available on your device.
              </p>
              <div className="mt-6 grid gap-3">
                <button
                  type="button"
                  onClick={() => handleShareQrImage(shareJob)}
                  className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-700 transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow"
                >
                  Share QR Image
                </button>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShareJob(null)}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : null}
          </div>
        </div>
      </main>
    </div>
  )
}
