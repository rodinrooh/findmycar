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

const GLASS: React.CSSProperties = {
  background: "rgba(255,255,255,0.82)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
}

export default function LeftPanel({ tows, selectedId, onSelect }: LeftPanelProps) {
  const [tab, setTab] = useState<Tab>("cars")
  const [search, setSearch] = useState("")
  const [mobileExpanded, setMobileExpanded] = useState(false)

  const filtered = search.trim()
    ? tows.filter((t) =>
        (t.license ?? "").toLowerCase().includes(search.trim().toLowerCase())
      )
    : tows

  const body = (
    <>
      <div className="px-4 pt-2 pb-1">
        <input
          type="text"
          placeholder="Search by license plate…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-1.5 rounded-[10px] text-[13px] outline-none"
          style={{ background: "rgba(118,118,128,0.12)", color: "#1c1c1e" }}
        />
      </div>
      <div className="px-4 pt-2 pb-3">
        <div className="flex rounded-[10px] p-[3px]" style={{ background: "rgba(118,118,128,0.12)" }}>
          <TabButton active={tab === "cars"} onClick={() => setTab("cars")}>Cars</TabButton>
          <TabButton active={tab === "leaderboard"} onClick={() => setTab("leaderboard")}>Leaderboard</TabButton>
        </div>
      </div>
      <div className="flex flex-col flex-1 overflow-hidden">
        {tab === "cars" ? (
          <CarList tows={filtered} selectedId={selectedId} onSelect={onSelect} />
        ) : (
          <Leaderboard tows={tows} />
        )}
      </div>
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
    </>
  )

  return (
    <>
      {/* Desktop: left sidebar */}
      <div
        className="hidden md:flex absolute left-0 top-0 h-full flex-col"
        style={{ width: 320, borderRight: "1px solid rgba(0,0,0,0.1)", zIndex: 10, ...GLASS }}
      >
        <div className="px-4 pt-4 pb-2 flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ background: "#ff5f57" }} />
          <div className="w-3 h-3 rounded-full" style={{ background: "#febc2e" }} />
          <div className="w-3 h-3 rounded-full" style={{ background: "#28c840" }} />
        </div>
        {body}
      </div>

      {/* Mobile: bottom sheet */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 flex flex-col rounded-t-[20px] overflow-hidden"
        style={{
          height: mobileExpanded ? "70vh" : 180,
          transition: "height 0.3s cubic-bezier(0.32,0.72,0,1)",
          boxShadow: "0 -2px 20px rgba(0,0,0,0.1)",
          zIndex: 10,
          ...GLASS,
        }}
        onClick={!mobileExpanded ? () => setMobileExpanded(true) : undefined}
      >
        <div
          className="flex justify-center items-center flex-shrink-0 cursor-pointer"
          style={{ paddingTop: 10, paddingBottom: 10, minHeight: 44 }}
          onClick={(e) => { e.stopPropagation(); setMobileExpanded((v) => !v) }}
        >
          <div className="w-9 h-[5px] rounded-full bg-[#c7c7cc]" />
        </div>
        <div className="flex flex-col flex-1 overflow-hidden" onClick={(e) => e.stopPropagation()}>
          {body}
        </div>
      </div>
    </>
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
