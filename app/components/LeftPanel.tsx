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
      <div className="px-5 pt-6 pb-2">
        <div className="flex items-center gap-2.5 mb-0.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
            style={{ background: "linear-gradient(145deg, #ff3b30, #ff6b35)" }}
          >
            🚗
          </div>
          <h1 className="text-[17px] font-bold text-[#1c1c1e] tracking-tight">
            Find My Towed Car
          </h1>
        </div>
        <p className="text-xs text-[#8e8e93] pl-[38px]">
          {loading
            ? "Loading…"
            : `${tows.length} car${tows.length !== 1 ? "s" : ""} towed in SF today`}
        </p>
      </div>

      {/* Tab switcher */}
      <div className="px-4 pt-3 pb-3">
        <div
          className="flex rounded-[10px] p-[3px]"
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
