"use client"

import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

import { apiRequest } from "../../lib/api"

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
          window.location.href = "qrbulkgen://login?reset=1"
          setTimeout(() => {
            router.push("/login")
          }, 900)
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
                onClick={() => setHandoffAttempted(true)}
                className="rounded border border-black px-4 py-2"
              >
                Continue In Browser
              </button>
            </div>
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
