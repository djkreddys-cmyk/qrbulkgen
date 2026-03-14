"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import Navbar from "../../components/Navbar"
import { apiRequest, API_BASE_URL } from "../../lib/api"
import { clearAuthSession, getAuthToken } from "../../lib/auth"

function toAbsoluteDownloadUrl(filePath) {
  if (!filePath) return ""
  if (/^https?:\/\//i.test(filePath)) return filePath
  const origin = API_BASE_URL.replace(/\/api\/?$/, "")
  return `${origin}${filePath}`
}

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [summary, setSummary] = useState(null)
  const [jobs, setJobs] = useState([])
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      const token = getAuthToken()
      if (!token) {
        router.replace("/login")
        return
      }

      try {
        const headers = { Authorization: `Bearer ${token}` }
        const [meData, summaryData, jobsData] = await Promise.all([
          apiRequest("/auth/me", { headers }),
          apiRequest("/qr/jobs/summary", { headers }),
          apiRequest("/qr/jobs?limit=8", { headers }),
        ])
        setUser(meData.user)
        setSummary(summaryData.summary)
        setJobs(jobsData.jobs || [])
      } catch (requestError) {
        clearAuthSession()
        setError(requestError.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [router])

  return (
    <div>
      <Navbar />

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>

        {isLoading && <p>Loading account...</p>}
        {!isLoading && error && <p className="text-red-600">{error}</p>}

        {!isLoading && user && (
          <>
            <p>Welcome {user.name || user.email}</p>

            {summary && (
              <section className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="border rounded p-4">
                  <p className="text-sm text-gray-600">Total Jobs</p>
                  <p className="text-2xl font-bold">{summary.totalJobs}</p>
                </div>
                <div className="border rounded p-4">
                  <p className="text-sm text-gray-600">Requested</p>
                  <p className="text-2xl font-bold">{summary.totalRequested}</p>
                </div>
                <div className="border rounded p-4">
                  <p className="text-sm text-gray-600">Success</p>
                  <p className="text-2xl font-bold text-green-700">{summary.totalSuccess}</p>
                </div>
                <div className="border rounded p-4">
                  <p className="text-sm text-gray-600">Failure</p>
                  <p className="text-2xl font-bold text-red-700">{summary.totalFailure}</p>
                </div>
              </section>
            )}

            <section className="border rounded p-6 bg-white">
              <h2 className="text-xl font-semibold mb-4">Recent Bulk Jobs</h2>
              {!jobs.length && <p className="text-gray-600">No jobs yet.</p>}
              {!!jobs.length && (
                <div className="space-y-3">
                  {jobs.map((job) => (
                    <article key={job.id} className="border rounded p-4">
                      <div className="flex flex-wrap justify-between gap-2">
                        <p className="font-mono text-sm">{job.id}</p>
                        <span className="text-sm uppercase">{job.status}</span>
                      </div>
                      <p className="text-sm mt-1">File: {job.sourceFileName || "-"}</p>
                      <p className="text-sm">
                        Rows: {job.totalCount} | Success: {job.successCount} | Failure:{" "}
                        {job.failureCount}
                      </p>
                      {job.errorMessage && (
                        <p className="text-sm text-red-600 mt-1">{job.errorMessage}</p>
                      )}
                      {job.artifact?.filePath && (
                        <a
                          className="inline-block mt-2 underline"
                          href={toAbsoluteDownloadUrl(job.artifact.filePath)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Download ZIP
                        </a>
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
