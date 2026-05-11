"use client"

// Skip static prerendering — this page requires browser APIs and live data
export const dynamic = "force-dynamic"

import { useCallback, useRef, useState } from "react"
import LeftPanel from "./components/LeftPanel"
import Map, { type MapHandle } from "./components/Map"
import DetailCard from "./components/DetailCard"
import WelcomeModal from "./components/WelcomeModal"
import { useTows } from "@/lib/useTows"
import type { Tow } from "@/lib/types"

export default function Home() {
  const { tows, loading, todayCount } = useTows()
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
    mapRef.current?.resetView()
  }, [])

  return (
    <div className="relative h-full w-full overflow-hidden">
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
      {/* Today's count badge */}
      {!loading && (
        <div
          className="absolute top-4 right-4 z-20 px-3.5 py-2 rounded-2xl text-[13px] font-semibold text-[#1c1c1e]"
          style={{
            background: "rgba(255,255,255,0.82)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow: "0 1px 8px rgba(0,0,0,0.12)",
          }}
        >
          {todayCount} car{todayCount !== 1 ? "s" : ""} towed today
        </div>
      )}

      {selectedTow && (
        <DetailCard tow={selectedTow} onClose={handleClose} />
      )}
      <WelcomeModal />
    </div>
  )
}
