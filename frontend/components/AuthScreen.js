"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"

import { apiRequest } from "../lib/api"
import { saveAuthSession } from "../lib/auth"

export default function AuthScreen({ defaultMode = "register" }) {
  const router = useRouter()
  const [mode, setMode] = useState(defaultMode)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isRegisterMode = mode === "register"

  async function handleSubmit(event) {
    event.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
      const data = await apiRequest(isRegisterMode ? "/auth/register" : "/auth/login", {
        method: "POST",
        body: JSON.stringify(
          isRegisterMode
            ? { name, email, phone, password }
            : { identifier: email, password },
        ),
      })

      saveAuthSession(data)
      router.push("/dashboard")
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  function switchMode(nextMode) {
    setMode(nextMode)
    setError("")
  }

  function handleSocialClick(provider) {
    setError(`${provider} login needs OAuth app credentials and redirect setup before it can be enabled.`)
  }

  return (
    <div className="flex justify-center mt-32 px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex gap-3">
          <button
            type="button"
            onClick={() => switchMode("register")}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold ${
              isRegisterMode ? "bg-black text-white" : "border border-slate-300 text-slate-700"
            }`}
          >
            Register
          </button>
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold ${
              !isRegisterMode ? "bg-black text-white" : "border border-slate-300 text-slate-700"
            }`}
          >
            Login
          </button>
        </div>

        <h1 className="mb-4 text-2xl font-bold">
          {isRegisterMode ? "Create Account" : "Login"}
        </h1>

        {isRegisterMode ? (
          <input
            placeholder="Name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mb-3 w-full rounded border p-2"
          />
        ) : null}

        {isRegisterMode ? (
          <input
            placeholder="Mobile number"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="mb-3 w-full rounded border p-2"
          />
        ) : null}

        <input
          placeholder={isRegisterMode ? "Email" : "Email or Mobile number"}
          type="text"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mb-3 w-full rounded border p-2"
        />

        <div className="relative mb-3">
          <input
            placeholder="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded border p-2 pr-16"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-600"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        {!isRegisterMode ? (
          <div className="mb-3 flex justify-end text-sm">
            <Link href="/forgot-password" className="text-gray-700 underline">
              Forgot password?
            </Link>
          </div>
        ) : null}

        {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}

        <button
          disabled={isSubmitting}
          className="w-full rounded bg-black py-2 text-white disabled:opacity-60"
        >
          {isSubmitting
            ? isRegisterMode
              ? "Creating account..."
              : "Logging in..."
            : isRegisterMode
              ? "Register"
              : "Login"}
        </button>

        <div className="mt-4 space-y-3">
          <button
            type="button"
            onClick={() => handleSocialClick("Google")}
            className="w-full rounded border border-slate-300 py-2 text-slate-800"
          >
            Continue with Google
          </button>
          <button
            type="button"
            onClick={() => handleSocialClick("Microsoft")}
            className="w-full rounded border border-slate-300 py-2 text-slate-800"
          >
            Continue with Microsoft
          </button>
        </div>

        <p className="mt-4 text-sm text-gray-600">
          {isRegisterMode ? "Already have an account?" : "Need an account?"}{" "}
          <button
            type="button"
            onClick={() => switchMode(isRegisterMode ? "login" : "register")}
            className="underline"
          >
            {isRegisterMode ? "Login" : "Register"}
          </button>
        </p>
      </form>
    </div>
  )
}
