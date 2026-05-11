import { createClient, type SupabaseClient } from "@supabase/supabase-js"

// Lazy singleton — created on first use, never at module load time.
// This avoids SSR prerender errors when env vars aren't present at build.
let _client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return _client
}

// Named export for convenience in components
export const supabase = {
  from: (...args: Parameters<SupabaseClient["from"]>) => getSupabase().from(...args),
}
