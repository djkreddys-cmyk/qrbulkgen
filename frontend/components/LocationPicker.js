"use client"

import { useEffect, useMemo, useRef, useState } from "react"

const DEFAULT_CENTER = { lat: 17.385, lng: 78.4867 }
const LEAFLET_CSS_ID = "leaflet-osm-css"
const LEAFLET_JS_ID = "leaflet-osm-js"

let leafletPromise = null

function buildOsmUrl(latitude, longitude) {
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`
}

function loadLeaflet() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Leaflet can only load in the browser."))
  }

  if (window.L) {
    return Promise.resolve(window.L)
  }

  if (!leafletPromise) {
    leafletPromise = new Promise((resolve, reject) => {
      if (!document.getElementById(LEAFLET_CSS_ID)) {
        const css = document.createElement("link")
        css.id = LEAFLET_CSS_ID
        css.rel = "stylesheet"
        css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        document.head.appendChild(css)
      }

      const existingScript = document.getElementById(LEAFLET_JS_ID)
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(window.L))
        existingScript.addEventListener("error", () => reject(new Error("Failed to load OpenStreetMap map tools.")))
        return
      }

      const script = document.createElement("script")
      script.id = LEAFLET_JS_ID
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
      script.async = true
      script.onload = () => resolve(window.L)
      script.onerror = () => reject(new Error("Failed to load OpenStreetMap map tools."))
      document.body.appendChild(script)
    })
  }

  return leafletPromise
}

async function searchPlaces(query) {
  const trimmed = String(query || "").trim()
  if (!trimmed) return []

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(trimmed)}`,
    {
      headers: {
        Accept: "application/json",
      },
    },
  )

  if (!response.ok) {
    throw new Error("Unable to search OpenStreetMap right now.")
  }

  return response.json()
}

async function reverseLookup(latitude, longitude) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`,
    {
      headers: {
        Accept: "application/json",
      },
    },
  )

  if (!response.ok) {
    throw new Error("Unable to read that map location.")
  }

  return response.json()
}

export default function LocationPicker({ value, onSelect }) {
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const [pickerError, setPickerError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [suggestions, setSuggestions] = useState([])
  const [isSearching, setIsSearching] = useState(false)

  const initialCenter = useMemo(() => {
    const latitude = Number(value?.latitude)
    const longitude = Number(value?.longitude)
    if (!Number.isNaN(latitude) && !Number.isNaN(longitude) && latitude && longitude) {
      return { lat: latitude, lng: longitude }
    }
    return DEFAULT_CENTER
  }, [value?.latitude, value?.longitude])

  useEffect(() => {
    setSearchQuery(value?.locationName || value?.locationAddress || "")
  }, [value?.locationName, value?.locationAddress])

  useEffect(() => {
    let active = true

    async function setupMap() {
      try {
        const L = await loadLeaflet()
        if (!active || !mapRef.current) return

        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove()
        }

        const map = L.map(mapRef.current, {
          center: [initialCenter.lat, initialCenter.lng],
          zoom: value?.latitude && value?.longitude ? 15 : 11,
          zoomControl: true,
        })

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map)

        const marker = L.marker([initialCenter.lat, initialCenter.lng], {
          opacity: value?.latitude && value?.longitude ? 1 : 0,
        }).addTo(map)

        window.setTimeout(() => {
          map.invalidateSize()
        }, 150)

        map.on("click", async (event) => {
          const latitude = Number(event.latlng.lat).toFixed(6)
          const longitude = Number(event.latlng.lng).toFixed(6)
          marker.setLatLng([latitude, longitude]).setOpacity(1)
          map.panTo([latitude, longitude])

          onSelect?.({
            locationName: value?.locationName || "Pinned location",
            locationAddress: value?.locationAddress || "",
            mapsUrl: buildOsmUrl(latitude, longitude),
            latitude: String(latitude),
            longitude: String(longitude),
          })

          try {
            const result = await reverseLookup(latitude, longitude)
            const locationAddress = result?.display_name || ""
            const locationName =
              result?.name ||
              result?.address?.amenity ||
              result?.address?.building ||
              result?.address?.road ||
              "Pinned location"

            onSelect?.({
              locationName,
              locationAddress,
              mapsUrl: buildOsmUrl(latitude, longitude),
              latitude: String(latitude),
              longitude: String(longitude),
            })
          } catch (_error) {
            onSelect?.({
              locationName: value?.locationName || "Pinned location",
              locationAddress: value?.locationAddress || "",
              mapsUrl: buildOsmUrl(latitude, longitude),
              latitude: String(latitude),
              longitude: String(longitude),
            })
          }
        })

        mapInstanceRef.current = map
        markerRef.current = marker
      } catch (error) {
        if (active) {
          setPickerError(error.message || "Location picker is unavailable right now.")
        }
      }
    }

    setupMap()

    return () => {
      active = false
    }
  }, [initialCenter.lat, initialCenter.lng, value?.latitude, value?.longitude])

  useEffect(() => {
    const map = mapInstanceRef.current
    const marker = markerRef.current
    const latitude = Number(value?.latitude)
    const longitude = Number(value?.longitude)
    if (!map || !marker || Number.isNaN(latitude) || Number.isNaN(longitude) || !latitude || !longitude) {
      return
    }

    marker.setLatLng([latitude, longitude]).setOpacity(1)
    map.panTo([latitude, longitude])
    window.setTimeout(() => {
      map.invalidateSize()
    }, 80)
  }, [value?.latitude, value?.longitude])

  useEffect(() => {
    const trimmed = String(searchQuery || "").trim()
    if (trimmed.length < 3) {
      setSuggestions([])
      return
    }

    let active = true
    const timeout = window.setTimeout(async () => {
      try {
        setIsSearching(true)
        const results = await searchPlaces(trimmed)
        if (active) {
          setSuggestions(Array.isArray(results) ? results : [])
          setPickerError("")
        }
      } catch (error) {
        if (active) {
          setSuggestions([])
          setPickerError(error.message || "Unable to search OpenStreetMap right now.")
        }
      } finally {
        if (active) {
          setIsSearching(false)
        }
      }
    }, 350)

    return () => {
      active = false
      window.clearTimeout(timeout)
    }
  }, [searchQuery])

  async function handleSuggestionSelect(place) {
    const latitude = Number(place.lat).toFixed(6)
    const longitude = Number(place.lon).toFixed(6)
    setSearchQuery(place.display_name || "")
    setSuggestions([])

    if (mapInstanceRef.current && markerRef.current) {
      markerRef.current.setLatLng([latitude, longitude]).setOpacity(1)
      mapInstanceRef.current.setView([latitude, longitude], 16)
    }

    onSelect?.({
      locationName: place.name || place.display_name?.split(",")[0] || "Selected place",
      locationAddress: place.display_name || "",
      mapsUrl: buildOsmUrl(latitude, longitude),
      latitude: String(latitude),
      longitude: String(longitude),
    })
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">Interactive Location Picker</p>
        <p className="mt-1 text-xs text-slate-500">Search a place or click anywhere on the map to auto-fill the location QR fields.</p>
      </div>
      <div className="space-y-3 p-4">
        <div className="relative">
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search places"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
          {!!suggestions.length && (
            <div className="absolute z-20 mt-2 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
              {suggestions.map((place) => (
                <button
                  key={`${place.place_id}-${place.lat}-${place.lon}`}
                  type="button"
                  onClick={() => handleSuggestionSelect(place)}
                  className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  {place.display_name}
                </button>
              ))}
            </div>
          )}
        </div>
        {isSearching && <p className="text-xs text-slate-500">Searching OpenStreetMap...</p>}
        {pickerError ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700">
            {pickerError}
          </div>
        ) : (
          <div ref={mapRef} className="h-72 w-full rounded-xl border border-slate-200 [touch-action:none]" />
        )}
      </div>
    </div>
  )
}
