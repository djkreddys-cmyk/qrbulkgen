"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import {
  clearAuthSession,
  getAuthIdleTimeoutMs,
  getAuthUser,
  isAuthenticated,
  loadAuthSession,
  markAuthActivity,
} from "../lib/auth"

const MOBILE_APP_INSTALL_URL = process.env.NEXT_PUBLIC_ANDROID_APP_URL || ""
const marketingLinks = [
  { href: "/use-cases", label: "Use Cases" },
]
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

  useEffect(() => {
    if (!authed || typeof window === "undefined") {
      return undefined
    }

    const activityEvents = ["click", "keydown", "mousemove", "scroll", "touchstart"]
    let timeoutId = null

    function handleAutoLogout() {
      clearAuthSession()
      setSession(null)
      router.push("/login")
    }

    function scheduleLogout() {
      const activeSession = loadAuthSession()
      const lastActivityAt = Number(activeSession?.lastActivityAt || 0)
      const remainingMs = lastActivityAt
        ? Math.max(getAuthIdleTimeoutMs() - (Date.now() - lastActivityAt), 0)
        : getAuthIdleTimeoutMs()

      if (timeoutId) {
        window.clearTimeout(timeoutId)
      }
      timeoutId = window.setTimeout(handleAutoLogout, remainingMs)
    }

    function handleActivity() {
      markAuthActivity()
      scheduleLogout()
    }

    scheduleLogout()

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, { passive: true })
    })

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId)
      }
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity)
      })
    }
  }, [authed, router])

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
      <nav className="flex flex-col gap-4 border-b p-6 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-xl font-bold">QRBulkGen</h1>

        <div className="flex flex-wrap items-center gap-4 text-gray-700 lg:gap-6">
          {authed ? (
            <>
              <Link href="/generate?type=qr&mode=single">Generate</Link>
              <Link href="/dashboard?type=qr&mode=single">Analysis</Link>
              <Link href="/pricing">Pricing</Link>
            </>
          ) : (
            <>
              <Link href="/">Home</Link>
              <Link href="/pricing">Pricing</Link>
              <Link href="/#insights">Blog</Link>
              {marketingLinks.map((link) => (
                <Link key={link.href} href={link.href} className="text-sm text-slate-600 hover:text-slate-950">
                  {link.label}
                </Link>
              ))}
            </>
          )}

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
