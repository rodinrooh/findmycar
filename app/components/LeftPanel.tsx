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
  const [search, setSearch] = useState("")

  const filtered = search.trim()
    ? tows.filter((t) =>
        (t.license ?? "").toLowerCase().includes(search.trim().toLowerCase())
      )
    : tows

  return (
    <div
      className="absolute left-0 top-0 h-full flex flex-col"
      style={{
        width: 320,
        borderRight: "1px solid rgba(0,0,0,0.1)",
        background: "rgba(255,255,255,0.75)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        zIndex: 10,
      }}
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
      </div>

      {/* Search */}
      <div className="px-4 pt-2 pb-1">
        <input
          type="text"
          placeholder="Search by license plate…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-1.5 rounded-[10px] text-[13px] outline-none"
          style={{
            background: "rgba(118,118,128,0.12)",
            color: "#1c1c1e",
          }}
        />
      </div>

      {/* Tab switcher */}
      <div className="px-4 pt-2 pb-3">
        <div
          className="flex rounded-[10px] p-[3px]"
          style={{ background: "rgba(118,118,128,0.12)" }}
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
          <CarList tows={filtered} selectedId={selectedId} onSelect={onSelect} />
        ) : (
          <Leaderboard tows={tows} />
        )}
      </div>

      {/* Footer credit */}
      <div className="px-5 py-3" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
        <a
          href="https://walzr.com/sf-parking/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[12px] text-[#8e8e93] hover:text-[#007aff] transition-colors"
        >
          Inspired by Riley Walz
        </a>
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
