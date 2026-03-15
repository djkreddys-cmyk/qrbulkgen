"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

import { loadAuthSession } from "../lib/auth"

export default function HomeRedirectGuard() {
  const router = useRouter()

  useEffect(() => {
    const session = loadAuthSession()
    if (session?.user?.email) {
      router.replace("/dashboard")
    }
  }, [router])

  return null
}
