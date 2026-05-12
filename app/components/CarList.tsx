"use client"

import type { Tow } from "@/lib/types"
import CarRow from "./CarRow"

interface CarListProps {
  tows: Tow[]
  selectedId: number | null
  onSelect: (tow: Tow) => void
}

export default function CarList({ tows, selectedId, onSelect }: CarListProps) {
  if (tows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-[#8e8e93] text-sm">
        <div className="text-3xl mb-2">🚗</div>
        <div>No tows yet today</div>
      </div>
    )
  }

  return (
    <div className="overflow-y-auto flex-1">
      <p style={{
        margin: "8px 16px 4px",
        padding: "8px 12px",
        borderRadius: "8px",
        background: "#fffbe6",
        border: "1px solid #f5d020",
        fontSize: "11px",
        fontWeight: 300,
        fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
        lineHeight: "1.5",
        color: "#7a5c00",
      }}>
        This site only worked for 4 hours until Autura added a firewall to the data source I was using. This data is a snapshot of how it looked on May 12, 2026 at 1:43 PM.
      </p>
      {tows.map((tow) => (
        <CarRow
          key={tow.vehicle_id}
          tow={tow}
          selected={tow.vehicle_id === selectedId}
          onClick={() => onSelect(tow)}
        />
      ))}
    </div>
  )
}
