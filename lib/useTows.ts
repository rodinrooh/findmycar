"use client"

import { useEffect, useState } from "react"
import { supabase } from "./supabase"
import type { Tow } from "./types"

function todayStart(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export function useTows() {
  const [tows, setTows] = useState<Tow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTows = async () => {
    const { data, error } = await supabase
      .from("tows")
      .select("*")
      .gte("towed_at", todayStart())
      .order("towed_at", { ascending: false })
    if (!error && data) {
      setTows(data as Tow[])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchTows()
    const interval = setInterval(fetchTows, 60_000)
    return () => clearInterval(interval)
  }, [])

  return { tows, loading, refetch: fetchTows }
}
