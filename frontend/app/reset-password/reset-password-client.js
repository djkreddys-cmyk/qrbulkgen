"use client"

import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

import { apiRequest } from "../../lib/api"

const MOBILE_APP_INSTALL_URL = process.env.NEXT_PUBLIC_ANDROID_APP_URL || ""

export default function ResetPasswordClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token") || ""
  const [isMobileBrowser, setIsMobileBrowser] = useState(false)
  const [handoffAttempted, setHandoffAttempted] = useState(false)

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [appHandoffMessage, setAppHandoffMessage] = useState("")
  const appResetUrl = useMemo(
    () => (token ? `qrbulkgen://reset-password?token=${encodeURIComponent(token)}` : ""),
    [token],
  )

  useEffect(() => {
    if (typeof window === "undefined") return

    const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(window.navigator.userAgent || "")
    setIsMobileBrowser(mobile)

    if (mobile && token && !handoffAttempted) {
      setHandoffAttempted(true)
      window.location.href = appResetUrl
    }
  }, [appResetUrl, handoffAttempted, token])

  function openMobileApp(targetUrl, onFallback) {
    if (typeof window === "undefined") return

    setAppHandoffMessage("Trying to open QRBulkGen Mobile...")
    const startedAt = Date.now()
    window.location.href = targetUrl

    window.setTimeout(() => {
      if (Date.now() - startedAt >= 1200 && document.visibilityState === "visible") {
        setAppHandoffMessage(
          MOBILE_APP_INSTALL_URL
            ? "If the mobile app did not open, install the production app build or continue in browser. Expo Go will not handle qrbulkgen:// links."
            : "If the mobile app did not open, continue in browser or install the production mobile app build. Expo Go will not handle qrbulkgen:// links.",
        )
        if (typeof onFallback === "function") {
          onFallback()
        }
      }
    }, 1400)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage("")
    setError("")

    if (!token) {
      setError("Reset token is missing from the URL.")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setIsSubmitting(true)

    try {
      const data = await apiRequest("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      })

      setMessage(data.message)
      setTimeout(() => {
        if (typeof window !== "undefined" && isMobileBrowser) {
          openMobileApp("qrbulkgen://login?reset=1", () => {
            router.push("/login")
          })
          return
        }
        router.push("/login")
      }, 1200)
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex justify-center mt-32 px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-md border p-6 rounded bg-white">
        <h1 className="text-2xl font-bold mb-4">Reset Password</h1>

        {isMobileBrowser && token ? (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
            <p className="font-medium">Open this reset link in QRBulkGen Mobile for a better experience.</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <a
                href={appResetUrl}
                className="rounded bg-black px-4 py-2 text-white"
              >
                Open Mobile App
              </a>
              <button
                type="button"
                onClick={() => {
                  setHandoffAttempted(true)
                  setAppHandoffMessage("")
                }}
                className="rounded border border-black px-4 py-2"
              >
                Continue In Browser
              </button>
              <button
                type="button"
                onClick={() => openMobileApp(appResetUrl)}
                className="rounded border border-blue-300 px-4 py-2 text-blue-900"
              >
                Try Again
              </button>
              {MOBILE_APP_INSTALL_URL ? (
                <a
                  href={MOBILE_APP_INSTALL_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded border border-blue-300 px-4 py-2 text-blue-900"
                >
                  Install App
                </a>
              ) : null}
            </div>
            {appHandoffMessage ? <p className="mt-3 text-xs text-blue-900">{appHandoffMessage}</p> : null}
          </div>
        ) : null}

        <input
          placeholder="New password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="border p-2 w-full mb-3"
        />

        <input
          placeholder="Confirm new password"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className="border p-2 w-full mb-3"
        />

        {message && <p className="mb-3 text-sm text-green-700">{message}</p>}
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <button
          disabled={isSubmitting}
          className="bg-black text-white w-full py-2 disabled:opacity-60"
        >
          {isSubmitting ? "Resetting..." : "Reset Password"}
        </button>

        <p className="mt-4 text-sm text-gray-600">
          Back to{" "}
          <Link href="/login" className="underline">
            login
          </Link>
        </p>
      </form>
    </div>
  )
}
