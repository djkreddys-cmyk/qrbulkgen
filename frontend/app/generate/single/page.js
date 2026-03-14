"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import Navbar from "../../../components/Navbar"
import { apiRequest } from "../../../lib/api"
import { loadAuthSession } from "../../../lib/auth"

export default function SingleGeneratePage() {
  const router = useRouter()
  const [content, setContent] = useState("")
  const [size, setSize] = useState(512)
  const [foregroundColor, setForegroundColor] = useState("#000000")
  const [backgroundColor, setBackgroundColor] = useState("#ffffff")
  const [margin, setMargin] = useState(2)
  const [format, setFormat] = useState("png")
  const [errorCorrectionLevel, setErrorCorrectionLevel] = useState("M")
  const [filenamePrefix, setFilenamePrefix] = useState("qr")
  const [artifact, setArtifact] = useState(null)
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleGenerate(event) {
    event.preventDefault()
    setError("")
    setIsSubmitting(true)

    const session = loadAuthSession()
    if (!session?.token) {
      router.push("/login")
      return
    }

    try {
      const data = await apiRequest("/qr/single", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          content,
          size: Number(size),
          foregroundColor,
          backgroundColor,
          margin: Number(margin),
          format,
          errorCorrectionLevel,
          filenamePrefix,
        }),
      })

      setArtifact(data.artifact)
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold">Single QR Generator</h1>
        <p className="mt-2 text-gray-600">
          Generate dynamic QR codes with custom colors, size, format, and error correction.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          <form onSubmit={handleGenerate} className="border rounded-lg p-6 bg-white space-y-4">
            <div>
              <label className="block mb-1">Content (URL or text)</label>
              <input
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="https://example.com"
                className="w-full border p-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1">Size</label>
                <input
                  type="number"
                  value={size}
                  onChange={(event) => setSize(event.target.value)}
                  min={128}
                  max={2048}
                  className="w-full border p-2"
                />
              </div>
              <div>
                <label className="block mb-1">Margin</label>
                <input
                  type="number"
                  value={margin}
                  onChange={(event) => setMargin(event.target.value)}
                  min={0}
                  max={16}
                  className="w-full border p-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1">Foreground</label>
                <input
                  type="color"
                  value={foregroundColor}
                  onChange={(event) => setForegroundColor(event.target.value)}
                  className="w-full border p-1 h-10"
                />
              </div>
              <div>
                <label className="block mb-1">Background</label>
                <input
                  type="color"
                  value={backgroundColor}
                  onChange={(event) => setBackgroundColor(event.target.value)}
                  className="w-full border p-1 h-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1">Format</label>
                <select
                  value={format}
                  onChange={(event) => setFormat(event.target.value)}
                  className="w-full border p-2"
                >
                  <option value="png">PNG</option>
                  <option value="svg">SVG</option>
                </select>
              </div>
              <div>
                <label className="block mb-1">Error Correction</label>
                <select
                  value={errorCorrectionLevel}
                  onChange={(event) => setErrorCorrectionLevel(event.target.value)}
                  className="w-full border p-2"
                >
                  <option value="L">L</option>
                  <option value="M">M</option>
                  <option value="Q">Q</option>
                  <option value="H">H</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block mb-1">Filename Prefix</label>
              <input
                value={filenamePrefix}
                onChange={(event) => setFilenamePrefix(event.target.value)}
                className="w-full border p-2"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-black text-white py-2 disabled:opacity-60"
            >
              {isSubmitting ? "Generating..." : "Generate QR"}
            </button>
          </form>

          <section className="border rounded-lg p-6 bg-white">
            <h2 className="text-xl font-semibold">Preview</h2>

            {!artifact && <p className="mt-4 text-gray-600">Generate a QR code to preview and download.</p>}

            {artifact && (
              <div className="mt-4">
                <img
                  src={artifact.dataUrl}
                  alt="Generated QR Code"
                  className="max-w-full h-auto border p-2 bg-white"
                />
                <a
                  href={artifact.dataUrl}
                  download={artifact.fileName}
                  className="inline-block mt-4 px-4 py-2 bg-black text-white rounded"
                >
                  Download {artifact.fileName}
                </a>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
