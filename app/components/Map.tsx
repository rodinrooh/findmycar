"use client"

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react"
import { getStatusColor } from "@/lib/colorMap"
import type { Tow } from "@/lib/types"

// mapkit is declared globally in lib/mapkit.d.ts

export interface MapHandle {
  flyTo: (lat: number, lng: number) => void
}

interface MapProps {
  tows: Tow[]
  onSelectTow: (tow: Tow) => void
}

const SF_CENTER = { latitude: 37.7749, longitude: -122.4194 }
const MAPKIT_URL = "https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.js"

const Map = forwardRef<MapHandle, MapProps>(function Map({ tows, onSelectTow }, ref) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const annotationsRef = useRef<globalThis.Map<number, any>>(new globalThis.Map())
  const initRef = useRef(false)

  useImperativeHandle(ref, () => ({
    flyTo(lat: number, lng: number) {
      if (!mapRef.current) return
      mapRef.current.setCenterAnimated(new window.mapkit.Coordinate(lat, lng), true)
    },
  }))

  // Load MapKit JS and initialize map once
  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    function initMap() {
      const mk = window.mapkit
      if (!mk || !containerRef.current) return

      mk.init({
        authorizationCallback: async (done: (token: string) => void) => {
          const res = await fetch("/api/maps-token")
          const { token } = await res.json()
          done(token)
        },
      })

      const map = new mk.Map(containerRef.current, {
        center: new mk.Coordinate(SF_CENTER.latitude, SF_CENTER.longitude),
        cameraDistance: 15000,
        showsCompass: mk.FeatureVisibility.Adaptive,
        showsZoomControl: true,
        showsMapTypeControl: false,
      })

      mapRef.current = map
    }

    if (typeof window !== "undefined" && window.mapkit) {
      initMap()
      return
    }

    // Load the script if not present
    if (!document.querySelector(`script[src="${MAPKIT_URL}"]`)) {
      const script = document.createElement("script")
      script.src = MAPKIT_URL
      script.async = true
      script.onload = initMap
      document.head.appendChild(script)
    } else {
      // Script loading, wait for it
      const check = setInterval(() => {
        if (window.mapkit) {
          clearInterval(check)
          initMap()
        }
      }, 100)
    }
  }, [])

  // Sync annotations when tows change
  useEffect(() => {
    if (!mapRef.current) return
    const mk = window.mapkit
    if (!mk) return

    const map = mapRef.current
    const existing = annotationsRef.current
    const currentIds = new Set(tows.filter((t) => t.lat && t.lng).map((t) => t.vehicle_id))

    // Remove stale annotations
    for (const [vid, annotation] of existing.entries()) {
      if (!currentIds.has(vid)) {
        map.removeAnnotation(annotation)
        existing.delete(vid)
      }
    }

    // Add new annotations
    for (const tow of tows) {
      if (!tow.lat || !tow.lng) continue
      if (existing.has(tow.vehicle_id)) {
        const ann = existing.get(tow.vehicle_id)
        const el = ann.element as HTMLDivElement | undefined
        if (el) el.style.background = getStatusColor(tow.status)
        continue
      }

      const color = getStatusColor(tow.status)
      const initials = (tow.make ?? "??").slice(0, 2).toUpperCase()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const annotation = new (mk as any).Annotation(
        new mk.Coordinate(tow.lat, tow.lng),
        () => {
          const el = document.createElement("div")
          el.textContent = initials
          el.style.cssText = `
            width:34px;height:34px;border-radius:50%;
            background:${color};color:#fff;
            display:flex;align-items:center;justify-content:center;
            font:700 11px/1 -apple-system,BlinkMacSystemFont,sans-serif;
            letter-spacing:.5px;
            box-shadow:0 2px 8px rgba(0,0,0,.28);
            cursor:pointer;
          `
          return el
        },
        { anchorOffset: new DOMPoint(0, 0) }
      )

      annotation.addEventListener("select", () => onSelectTow(tow))
      map.addAnnotation(annotation)
      existing.set(tow.vehicle_id, annotation)
    }
  }, [tows, onSelectTow])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
    />
  )
})

export default Map
