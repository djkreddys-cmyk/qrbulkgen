"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { clearAuthSession, getAuthUser, isAuthenticated, loadAuthSession } from "../lib/auth"

const MOBILE_APP_INSTALL_URL = process.env.NEXT_PUBLIC_ANDROID_APP_URL || ""

export default function Navbar() {
  const router = useRouter()
  const [session, setSession] = useState(null)
  const [showAppPrompt, setShowAppPrompt] = useState(false)
  const [appPromptMessage, setAppPromptMessage] = useState("")
  const authed = isAuthenticated()
  const user = session?.user || getAuthUser()

  useEffect(() => {
    const loadedSession = loadAuthSession()
    const loadedUser = getAuthUser()
    setSession(loadedUser ? { ...loadedSession, user: loadedUser } : loadedSession)
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
    router.push("/")
  }

  function handleDismissAppPrompt() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("qrbulkgen-mobile-prompt-dismissed", "1")
    }
    setShowAppPrompt(false)
  }

  function handleOpenApp() {
    if (typeof window === "undefined") return

    setAppPromptMessage("Trying to open QRBulkGen Mobile...")
    const startedAt = Date.now()
    window.location.href = "qrbulkgen://dashboard"

    window.setTimeout(() => {
      if (Date.now() - startedAt >= 1200 && document.visibilityState === "visible") {
        setAppPromptMessage(
          MOBILE_APP_INSTALL_URL
            ? "If the app did not open, install the production build and try again."
            : "If the app did not open, you are likely using Expo Go or the production app is not installed yet.",
        )
      }
    }, 1400)
  }

  return (
    <>
      {showAppPrompt ? (
        <div className="flex flex-col gap-3 border-b bg-slate-50 px-6 py-4 text-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-semibold text-slate-900">Use QRBulkGen Mobile for a better experience.</p>
            <p className="text-slate-600">
              {authed
                ? "Open the mobile app to manage scans, jobs, and password resets more comfortably on your phone."
                : "Install or open QRBulkGen Mobile to scan QR codes, monitor jobs, and continue your workflow on phone."}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleOpenApp}
              className="rounded bg-black px-4 py-2 text-white"
            >
              Open App
            </button>
            {MOBILE_APP_INSTALL_URL ? (
              <a
                href={MOBILE_APP_INSTALL_URL}
                className="rounded border border-slate-300 px-4 py-2 text-slate-700"
                target="_blank"
                rel="noreferrer"
              >
                Install App
              </a>
            ) : null}
            <button
              onClick={handleDismissAppPrompt}
              className="rounded border border-slate-300 px-4 py-2 text-slate-700"
            >
              Maybe Later
            </button>
          </div>
          {appPromptMessage ? <p className="text-xs text-slate-500 md:text-right">{appPromptMessage}</p> : null}
        </div>
      ) : null}
      <nav className="flex justify-between items-center p-6 border-b">
        <h1 className="text-xl font-bold">QRBulkGen</h1>

        <div className="flex items-center gap-6 text-gray-700">
          {!authed ? <Link href="/">Home</Link> : null}
          <Link href="/generate">Generate</Link>
          <Link href="/short-links">Short Links</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/dashboard">Dashboard</Link>

          {authed ? (
            <>
              <span className="text-sm text-gray-600">
                {user?.name || user?.email || "Account"}
              </span>
              <button onClick={handleLogout} className="underline">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login">Login/Register</Link>
            </>
          )}
        </div>
      </nav>
    </>
  )
}
