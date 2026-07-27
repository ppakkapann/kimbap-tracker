import { isSupabaseConfigured } from "@/lib/supabase/env";

export function isDemoMode(): boolean {
  return !isSupabaseConfigured();
}
