"use client"

// Skip static prerendering — this page requires browser APIs and live data
export const dynamic = "force-dynamic"

import { useCallback, useRef, useState } from "react"
import LeftPanel from "./components/LeftPanel"
import Map, { type MapHandle } from "./components/Map"
import DetailCard from "./components/DetailCard"
import { useTows } from "@/lib/useTows"
import type { Tow } from "@/lib/types"

export default function Home() {
  const { tows, loading } = useTows()
  const [selectedTow, setSelectedTow] = useState<Tow | null>(null)
  const mapRef = useRef<MapHandle>(null)

  const handleSelect = useCallback((tow: Tow) => {
    setSelectedTow(tow)
    if (tow.lat && tow.lng) {
      mapRef.current?.flyTo(tow.lat, tow.lng)
    }
  }, [])

  const handleClose = useCallback(() => {
    setSelectedTow(null)
  }, [])

  return (
    <div className="flex h-full w-full overflow-hidden">
      <LeftPanel
        tows={tows}
        loading={loading}
        selectedId={selectedTow?.vehicle_id ?? null}
        onSelect={handleSelect}
      />
      <Map
        ref={mapRef}
        tows={tows}
        onSelectTow={handleSelect}
      />
      {selectedTow && (
        <DetailCard tow={selectedTow} onClose={handleClose} />
      )}
    </div>
  )
}
