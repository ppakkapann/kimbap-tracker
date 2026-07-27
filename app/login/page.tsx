"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KimbapMark } from "@/components/brand/KimbapMark";
import { createClient } from "@/lib/supabase/client";
import { formatSupabaseAuthError } from "@/lib/supabase/env";

function isSupabaseConfiguredClient(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  return Boolean(url && key);
}

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!isSupabaseConfiguredClient()) {
      router.push("/");
      router.refresh();
      return;
    }

    try {
      const supabase = createClient();
      const { error: authError } = isSignUp
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(formatSupabaseAuthError(err));
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <KimbapMark size={56} />
          </div>
          <h1 className="app-title">คิมบับต้นทุน</h1>
          <p className="app-subtitle mt-2">
            คำนวณต้นทุน สต็อก และกำไรร้านคิมบับ
          </p>
        </div>

        <div className="app-card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block space-y-1.5">
              <span className="app-label">อีเมล</span>
              <input
                className="app-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="app-label">รหัสผ่าน</span>
              <input
                className="app-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••"
              />
            </label>

            {error && (
              <p
                className="rounded-lg px-3 py-2 text-sm"
                style={{ background: "var(--danger-muted)", color: "var(--danger)" }}
              >
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="app-btn app-btn-primary w-full">
              {loading ? "กำลังดำเนินการ..." : isSignUp ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="mt-4 w-full text-center text-sm app-link"
          >
            {isSignUp ? "มีบัญชีแล้ว? เข้าสู่ระบบ" : "ยังไม่มีบัญชี? สมัครสมาชิก"}
          </button>
        </div>
      </div>
    </div>
  );
}
