/** Supabase URL + anon/publishable key (trimmed). Supports both env var names. */

export function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
}

export function getSupabaseAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ??
    ""
  );
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}

export function formatSupabaseAuthError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (
    message.includes("fetch failed") ||
    message.includes("Failed to fetch") ||
    message.includes("ENOTFOUND") ||
    message.includes("getaddrinfo")
  ) {
    const url = getSupabaseUrl();
    return (
      "เชื่อม Supabase ไม่ได้ — ตรวจว่า project ยัง Active (ไม่ Pause) " +
      `และเปิด ${url || "(URL ว่าง)"}/auth/v1/health ใน browser ได้`
    );
  }
  return message;
}
