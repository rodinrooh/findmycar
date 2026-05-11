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
