"use client"

import { useState } from "react"
import type { Tow } from "@/lib/types"
import CarList from "./CarList"
import Leaderboard from "./Leaderboard"

type Tab = "cars" | "leaderboard"

interface LeftPanelProps {
  tows: Tow[]
  loading: boolean
  selectedId: number | null
  onSelect: (tow: Tow) => void
}

export default function LeftPanel({ tows, loading, selectedId, onSelect }: LeftPanelProps) {
  const [tab, setTab] = useState<Tab>("cars")

  return (
    <div
      className="flex flex-col h-full bg-white"
      style={{ width: 320, minWidth: 320, borderRight: "1px solid #e5e5ea" }}
    >
      {/* Header */}
      <div className="px-4 pt-5 pb-3">
        <h1 className="text-[17px] font-semibold text-[#1c1c1e] tracking-tight">
          Find My Towed Car
        </h1>
        <p className="text-xs text-[#8e8e93] mt-0.5">
          {loading
            ? "Loading…"
            : `${tows.length} car${tows.length !== 1 ? "s" : ""} towed in SF today`}
        </p>
      </div>

      {/* Tab switcher */}
      <div className="px-4 pb-3">
        <div
          className="flex rounded-lg p-0.5"
          style={{ background: "#e5e5ea" }}
        >
          <TabButton active={tab === "cars"} onClick={() => setTab("cars")}>
            Cars
          </TabButton>
          <TabButton active={tab === "leaderboard"} onClick={() => setTab("leaderboard")}>
            Leaderboard
          </TabButton>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {tab === "cars" ? (
          <CarList tows={tows} selectedId={selectedId} onSelect={onSelect} />
        ) : (
          <Leaderboard tows={tows} />
        )}
      </div>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 py-1.5 rounded-md text-sm font-medium transition-colors"
      style={{
        background: active ? "#ffffff" : "transparent",
        color: active ? "#1c1c1e" : "#8e8e93",
        boxShadow: active ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
      }}
    >
      {children}
    </button>
  )
}
