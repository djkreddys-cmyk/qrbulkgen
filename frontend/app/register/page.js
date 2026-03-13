"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"

import { apiRequest } from "../../lib/api"
import { saveAuthSession } from "../../lib/auth"

export default function Register() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
      const data = await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      })

      saveAuthSession(data)
      router.push("/dashboard")
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex justify-center mt-32 px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-md border p-6 rounded bg-white">
        <h1 className="text-2xl font-bold mb-4">Create Account</h1>

        <input
          placeholder="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="border p-2 w-full mb-3"
        />

        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="border p-2 w-full mb-3"
        />

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <button
          disabled={isSubmitting}
          className="bg-black text-white w-full py-2 disabled:opacity-60"
        >
          {isSubmitting ? "Creating account..." : "Register"}
        </button>

        <p className="mt-4 text-sm text-gray-600">
          Already have an account?{" "}
          <Link href="/login" className="underline">
            Login
          </Link>
        </p>
      </form>
    </div>
  )
}
