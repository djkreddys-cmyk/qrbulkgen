"use client"

import { useEffect, useState } from "react"
import Navbar from "../../components/Navbar"
import { SingleGenerateContent } from "./single/page"
import { BulkGenerateContent } from "../upload/page"

export default function GeneratePage() {
  const [mode, setMode] = useState("single")

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const queryMode = params.get("mode")
    if (queryMode === "bulk" || queryMode === "single") {
      setMode(queryMode)
    }
  }, [])

  return (
    <div>
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 pt-10">
        <div className="inline-flex border rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setMode("single")}
            className={`px-4 py-2 ${mode === "single" ? "bg-black text-white" : "bg-white text-black"}`}
          >
            Single
          </button>
          <button
            type="button"
            onClick={() => setMode("bulk")}
            className={`px-4 py-2 ${mode === "bulk" ? "bg-black text-white" : "bg-white text-black"}`}
          >
            Bulk
          </button>
        </div>
      </main>

      {mode === "single" ? <SingleGenerateContent embedded /> : <BulkGenerateContent embedded />}
    </div>
  )
}
