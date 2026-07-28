"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { LogOut, RotateCcw, UserRound } from "lucide-react";
import { resetDemoData, signOut } from "@/lib/actions";

export function AppUserMenu({ demo = false }: { demo?: boolean }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  function handleSignOut() {
    startTransition(async () => {
      await signOut();
      if (demo) {
        router.push("/");
        router.refresh();
      } else {
        router.push("/login");
      }
      setMenuOpen(false);
    });
  }

  function handleResetDemo() {
    if (!confirm("รีเซ็ตข้อมูล Demo กลับเป็นค่าเริ่มต้น?")) return;
    startTransition(async () => {
      await resetDemoData();
      router.refresh();
      setMenuOpen(false);
    });
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        aria-label="เมนูผู้ใช้"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
        className="flex h-8 w-8 items-center justify-center rounded-full transition hover:opacity-80"
        style={{
          background: "var(--accent-muted)",
          color: "var(--accent)",
          border: "1px solid rgba(20,168,184,.3)",
        }}
      >
        <UserRound size={15} />
      </button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div
            className="absolute right-0 z-50 mt-2 min-w-[180px] rounded-lg py-1 shadow-xl"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
            }}
          >
            {demo && (
              <button
                type="button"
                disabled={pending}
                onClick={handleResetDemo}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-[var(--bg-hover)]"
                style={{ color: "var(--text-primary)" }}
              >
                <RotateCcw size={14} />
                รีเซ็ตข้อมูล Demo
              </button>
            )}
            <button
              type="button"
              disabled={pending}
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-[var(--bg-hover)]"
              style={{ color: "var(--text-primary)" }}
            >
              <LogOut size={14} />
              {demo ? "รีเฟรชเซสชัน" : "ออกจากระบบ"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
