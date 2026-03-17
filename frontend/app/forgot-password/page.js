"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { apiRequest } from "../../lib/api"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState("")
  const [recoveryEmail, setRecoveryEmail] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isPhoneIdentifier = identifier.trim() && !identifier.includes("@")

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage("")
    setError("")
    setIsSubmitting(true)

    try {
      const data = await apiRequest("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ identifier, recoveryEmail }),
      })

      setMessage(data.message)
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
          Enter your registered email or mobile number. Email accounts receive a reset link directly. If you use a mobile number, add a valid email address and we’ll send the reset link there.
        </p>

        <input
          placeholder="Email / Mobile Number"
          type="text"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          className="border p-2 w-full mb-3"
        />

        {isPhoneIdentifier ? (
          <input
            placeholder="Recovery Email"
            type="email"
            value={recoveryEmail}
            onChange={(event) => setRecoveryEmail(event.target.value)}
            className="border p-2 w-full mb-3"
          />
        ) : null}

        {message && <p className="mb-3 text-sm text-green-700">{message}</p>}
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <button
          disabled={isSubmitting}
          className="bg-black text-white w-full py-2 disabled:opacity-60"
        >
          {isSubmitting ? "Sending..." : "Continue"}
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
