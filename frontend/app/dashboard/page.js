"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import Navbar from "../../components/Navbar"
import { apiRequest } from "../../lib/api"
import { clearAuthSession, loadAuthSession } from "../../lib/auth"

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadUser() {
      const session = loadAuthSession()

      if (!session?.token) {
        router.replace("/login")
        return
      }

      try {
        const data = await apiRequest("/auth/me", {
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
        })

        setUser(data.user)
      } catch (requestError) {
        clearAuthSession()
        setError(requestError.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadUser()
  }, [router])

  return (
    <div>
      <Navbar />

      <div className="p-10">
        <h1 className="text-3xl font-bold">Dashboard</h1>

        {isLoading && <p className="mt-4">Loading account...</p>}
        {!isLoading && error && <p className="mt-4 text-red-600">{error}</p>}
        {!isLoading && user && <p className="mt-4">Welcome {user.email}</p>}
      </div>
    </div>
  )
}
