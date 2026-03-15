"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { clearAuthSession, loadAuthSession } from "../lib/auth"

export default function Navbar() {
  const router = useRouter()
  const [session, setSession] = useState(null)
  const [showAppPrompt, setShowAppPrompt] = useState(false)

  useEffect(() => {
    setSession(loadAuthSession())
    if (typeof window !== "undefined") {
      const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(window.navigator.userAgent || "")
      const dismissed = window.localStorage.getItem("qrbulkgen-mobile-prompt-dismissed")
      if (isMobile && !dismissed) {
        setShowAppPrompt(true)
      }
    }
  }, [])

  function handleLogout() {
    clearAuthSession()
    setSession(null)
    router.push("/login")
  }

  function handleDismissAppPrompt() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("qrbulkgen-mobile-prompt-dismissed", "1")
    }
    setShowAppPrompt(false)
  }

  return (
    <>
      {showAppPrompt && session?.user?.email ? (
        <div className="flex flex-col gap-3 border-b bg-slate-50 px-6 py-4 text-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-semibold text-slate-900">Use QRBulkGen Mobile for a better experience.</p>
            <p className="text-slate-600">
              Open the mobile app to manage scans, jobs, and password resets more comfortably on your phone.
            </p>
          </div>
          <div className="flex gap-3">
            <a
              href="qrbulkgen://dashboard"
              className="rounded bg-black px-4 py-2 text-white"
            >
              Open App
            </a>
            <button
              onClick={handleDismissAppPrompt}
              className="rounded border border-slate-300 px-4 py-2 text-slate-700"
            >
              Maybe Later
            </button>
          </div>
        </div>
      ) : null}
      <nav className="flex justify-between items-center p-6 border-b">
        <h1 className="text-xl font-bold">QRBulkGen</h1>

        <div className="flex items-center gap-6 text-gray-700">
          <Link href="/">Home</Link>
          <Link href="/generate">Generate</Link>
          <Link href="/blog">Blog</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/dashboard">Dashboard</Link>

          {session?.user?.email ? (
            <>
              <span className="text-sm text-gray-600">
                {session.user.name || session.user.email}
              </span>
              <button onClick={handleLogout} className="underline">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login">Login</Link>
              <Link href="/register">Register</Link>
            </>
          )}
        </div>
      </nav>
    </>
  )
}
