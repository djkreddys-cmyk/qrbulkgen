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

  const activeLinks = useMemo(
    () => links.filter((link) => (showArchived ? true : !link.archivedAt)),
    [links, showArchived],
  )

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

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Short Links</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Create shareable short links</h1>
          <p className="mt-3 max-w-3xl text-slate-600">
            Create Bitly-style short links like <span className="font-semibold text-slate-900">qrbulkgen.com/a7K9xQ</span> with optional custom slugs, expiry, click counts, and archive support.
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">New short link</h2>
            <form className="mt-5 space-y-4" onSubmit={handleCreate}>
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
                <p className="mt-1 text-xs text-slate-500">Leave blank to auto-generate a short code.</p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Expiry (optional)</label>
                <input value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3" placeholder="DD-MM-YYYY" />
              </div>
              <button disabled={isSubmitting} className="w-full rounded-xl bg-slate-950 px-4 py-3 font-semibold text-white disabled:opacity-60">
                {isSubmitting ? "Creating..." : "Create Short Link"}
              </button>
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
                      <a href={link.url} target="_blank" rel="noreferrer" className="rounded-xl border border-sky-200 px-4 py-2 text-sm font-semibold text-sky-700">Open</a>
                      <button onClick={() => handleDelete(link)} className={`rounded-xl px-4 py-2 text-sm font-semibold ${link.archivedAt ? "border border-rose-200 text-rose-700" : "border border-amber-200 text-amber-700"}`}>
                        {link.archivedAt ? "Delete Permanently" : "Archive"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
