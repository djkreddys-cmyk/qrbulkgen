"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { apiRequest } from "../../lib/api"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState("")
  const [method, setMethod] = useState("")
  const [otp, setOtp] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [otpPreview, setOtpPreview] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isOtpMode = method === "phone"

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage("")
    setError("")
    setIsSubmitting(true)

    try {
      if (isOtpMode) {
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match.")
        }

        const data = await apiRequest("/auth/reset-password-otp", {
          method: "POST",
          body: JSON.stringify({ identifier, code: otp, password }),
        })

        setMessage(data.message)
        window.setTimeout(() => {
          router.push("/login")
        }, 900)
      } else {
        const data = await apiRequest("/auth/forgot-password", {
          method: "POST",
          body: JSON.stringify({ identifier }),
        })

        setMethod(data.method || "")
        setOtpPreview(data.otpPreview || "")
        setMessage(data.message)
      }
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex justify-center mt-32 px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-md border p-6 rounded bg-white">
        <h1 className="text-2xl font-bold mb-4">Forgot Password</h1>
        <p className="mb-4 text-sm text-gray-600">
          Enter your registered email or mobile number. Email accounts receive a reset link. Mobile-only accounts can reset with an OTP.
        </p>

        <input
          placeholder="Email / Mobile Number"
          type="text"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          className="border p-2 w-full mb-3"
          disabled={isOtpMode}
        />

        {isOtpMode ? (
          <>
            <input
              placeholder="OTP"
              type="text"
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
              className="border p-2 w-full mb-3"
            />
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
          </>
        ) : null}

        {message && <p className="mb-3 text-sm text-green-700">{message}</p>}
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        {otpPreview ? (
          <p className="mb-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Dev OTP preview: <span className="font-semibold">{otpPreview}</span>
          </p>
        ) : null}

        <button
          disabled={isSubmitting}
          className="bg-black text-white w-full py-2 disabled:opacity-60"
        >
          {isSubmitting ? (isOtpMode ? "Resetting..." : "Sending...") : isOtpMode ? "Verify OTP & Reset Password" : "Continue"}
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
