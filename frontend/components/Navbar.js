"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { clearAuthSession, loadAuthSession } from "../lib/auth"

export default function Navbar() {
  const router = useRouter()
  const [session, setSession] = useState(null)

  useEffect(() => {
    setSession(loadAuthSession())
  }, [])

  function handleLogout() {
    clearAuthSession()
    setSession(null)
    router.push("/login")
  }

  return (
    <nav className="flex justify-between items-center p-6 border-b">
      <h1 className="text-xl font-bold">QRBulkGen</h1>

      <div className="flex items-center gap-6 text-gray-700">
        <Link href="/">Home</Link>
        <Link href="/generate/single">Generate</Link>
        <Link href="/upload">Bulk</Link>
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
  )
}
