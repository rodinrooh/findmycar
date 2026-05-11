"use client"

import { useEffect, useState } from "react"

export default function WelcomeModal() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const seen = sessionStorage.getItem("welcome-seen")
    if (!seen) setOpen(true)
  }, [])

  function dismiss() {
    sessionStorage.setItem("welcome-seen", "1")
    setOpen(false)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background: "#ffffff", boxShadow: "0 24px 80px rgba(0,0,0,0.18)" }}
      >
        {/* Icon row */}
        <div className="flex flex-col items-center pt-8 pb-4 px-6">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4"
            style={{ background: "linear-gradient(145deg, #ff3b30, #ff6b35)" }}
          >
            🚗
          </div>
          <h1 className="text-[19px] font-bold text-[#1c1c1e] text-center tracking-tight">
            Find My Towed Car
          </h1>
          <p className="text-sm text-[#8e8e93] text-center mt-1">
            San Francisco, live
          </p>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "#f2f2f7" }} />

        {/* Explainer rows */}
        <div className="px-6 py-5 space-y-4">
          <Row
            icon="📍"
            title="What is this?"
            body="Every car being towed in SF right now, on a live map. Updated every 5 minutes."
          />
          <Row
            icon="🤫"
            title="Where's the data from?"
            body="AutoReturn runs SF's impound lots and leaves their entire database wide open — no login, no key, just vibes. We poll it constantly."
          />
          <Row
            icon="🫡"
            title="Inspired by"
            body={
              <>
                <a
                  href="https://walzr.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[#007aff]"
                >
                  Riley Walz
                </a>
                {" and his "}
                <a
                  href="https://walzr.com/find-my-parking-cops"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[#007aff]"
                >
                  Find My Parking Cops
                </a>
                {" — same energy, different car."}
              </>
            }
          />
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "#f2f2f7" }} />

        {/* Button */}
        <div className="px-6 py-4">
          <button
            onClick={dismiss}
            className="w-full py-3 rounded-xl text-white text-[15px] font-semibold transition-opacity active:opacity-75"
            style={{ background: "#007aff" }}
          >
            Find my (towed) car
          </button>
        </div>
      </div>
    </div>
  )
}

function Row({
  icon,
  title,
  body,
}: {
  icon: string
  title: string
  body: React.ReactNode
}) {
  return (
    <div className="flex gap-3">
      <div className="text-xl mt-0.5 flex-shrink-0">{icon}</div>
      <div>
        <div className="text-[13px] font-semibold text-[#1c1c1e]">{title}</div>
        <div className="text-[13px] text-[#6d6d72] mt-0.5 leading-snug">{body}</div>
      </div>
    </div>
  )
}
