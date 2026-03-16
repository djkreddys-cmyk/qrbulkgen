"use client"

import { useEffect, useMemo, useRef, useState } from "react"

const DEFAULT_CENTER = { lat: 17.385, lng: 78.4867 }
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""

let scriptPromise = null

function loadGoogleMapsScript() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps is only available in the browser."))
  }

  if (window.google?.maps?.places) {
    return Promise.resolve(window.google)
  }

  if (!GOOGLE_MAPS_API_KEY) {
    return Promise.reject(new Error("Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable the location picker."))
  }

  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script")
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`
      script.async = true
      script.defer = true
      script.onload = () => resolve(window.google)
      script.onerror = () => reject(new Error("Failed to load Google Maps."))
      document.head.appendChild(script)
    })
  }

  return scriptPromise
}

export default function LocationPicker({
  value,
  onSelect,
}) {
  const mapRef = useRef(null)
  const inputRef = useRef(null)
  const markerRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const autocompleteRef = useRef(null)
  const geocoderRef = useRef(null)
  const [pickerError, setPickerError] = useState("")

  const initialCenter = useMemo(() => {
    const latitude = Number(value?.latitude)
    const longitude = Number(value?.longitude)
    if (!Number.isNaN(latitude) && !Number.isNaN(longitude) && latitude && longitude) {
      return { lat: latitude, lng: longitude }
    }
    return DEFAULT_CENTER
  }, [value?.latitude, value?.longitude])

  useEffect(() => {
    let active = true

    async function setupMap() {
      try {
        const google = await loadGoogleMapsScript()
        if (!active || !mapRef.current || !inputRef.current) return

        geocoderRef.current = new google.maps.Geocoder()
        mapInstanceRef.current = new google.maps.Map(mapRef.current, {
          center: initialCenter,
          zoom: value?.latitude && value?.longitude ? 15 : 11,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        })

        markerRef.current = new google.maps.Marker({
          map: mapInstanceRef.current,
          position: initialCenter,
          visible: Boolean(value?.latitude && value?.longitude),
        })

        autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
          fields: ["formatted_address", "geometry", "name"],
        })

        autocompleteRef.current.addListener("place_changed", () => {
          const place = autocompleteRef.current.getPlace()
          const location = place?.geometry?.location
          if (!location) return

          const next = {
            locationName: place.name || "",
            locationAddress: place.formatted_address || "",
            mapsUrl: `https://www.google.com/maps?q=${location.lat()},${location.lng()}`,
            latitude: String(location.lat().toFixed(6)),
            longitude: String(location.lng().toFixed(6)),
          }

          markerRef.current?.setVisible(true)
          markerRef.current?.setPosition(location)
          mapInstanceRef.current?.panTo(location)
          mapInstanceRef.current?.setZoom(16)
          onSelect(next)
        })

        mapInstanceRef.current.addListener("click", (event) => {
          const latitude = event.latLng.lat()
          const longitude = event.latLng.lng()
          markerRef.current?.setVisible(true)
          markerRef.current?.setPosition(event.latLng)

          const next = {
            locationName: value?.locationName || "Pinned location",
            locationAddress: value?.locationAddress || "",
            mapsUrl: `https://www.google.com/maps?q=${latitude},${longitude}`,
            latitude: String(latitude.toFixed(6)),
            longitude: String(longitude.toFixed(6)),
          }

          if (geocoderRef.current) {
            geocoderRef.current.geocode({ location: { lat: latitude, lng: longitude } }, (results) => {
              const first = results?.[0]
              onSelect({
                ...next,
                locationAddress: first?.formatted_address || next.locationAddress,
                locationName: first?.address_components?.[0]?.long_name || next.locationName,
              })
            })
          } else {
            onSelect(next)
          }
        })
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
  }, [initialCenter.lat, initialCenter.lng])

  useEffect(() => {
    const map = mapInstanceRef.current
    const marker = markerRef.current
    const latitude = Number(value?.latitude)
    const longitude = Number(value?.longitude)
    if (!map || !marker || Number.isNaN(latitude) || Number.isNaN(longitude) || !latitude || !longitude) {
      return
    }

    const position = { lat: latitude, lng: longitude }
    marker.setVisible(true)
    marker.setPosition(position)
    map.panTo(position)
  }, [value?.latitude, value?.longitude])

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">Interactive Location Picker</p>
        <p className="mt-1 text-xs text-slate-500">Search a place or click anywhere on the map to auto-fill the location QR fields.</p>
      </div>
      <div className="space-y-3 p-4">
        <input
          ref={inputRef}
          defaultValue={value?.locationName || value?.locationAddress || ""}
          placeholder="Search places"
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        />
        {pickerError ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700">
            {pickerError}
          </div>
        ) : (
          <div ref={mapRef} className="h-72 w-full rounded-xl border border-slate-200" />
        )}
      </div>
    </div>
  )
}
