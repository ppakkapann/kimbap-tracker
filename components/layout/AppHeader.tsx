"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Bell, LogOut, Mail, RotateCcw, Search, UserRound } from "lucide-react";
import { resetDemoData, signOut } from "@/lib/actions";

export function AppHeader({ demo = false }: { demo?: boolean }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState("");
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
      const result = await resetDemoData();
      if (result.error) {
        setNotice(result.error);
      } else {
        setNotice("รีเซ็ตข้อมูล Demo แล้ว");
        router.refresh();
      }
      setMenuOpen(false);
    });
  }

  return (
    <header
      className="hidden h-[var(--header-height)] shrink-0 items-center justify-between border-b px-4 md:flex"
      style={{
        background: "var(--bg-base)",
        borderColor: "var(--border)",
      }}
    >
      <div
        className="flex h-8 w-full max-w-xs items-center gap-2 rounded px-3"
        style={{
          background: "var(--bg-hover)",
          border: "1px solid var(--border)",
          color: "var(--text-muted)",
        }}
      >
        <Search size={14} />
        <input
          aria-label="ค้นหา"
          placeholder="ค้นหาวัตถุดิบ (Enter ไปสต็อก)"
          className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-[var(--text-muted)]"
          style={{ color: "var(--text-primary)" }}
          suppressHydrationWarning
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const q = e.currentTarget.value.trim();
              if (q) router.push(`/stock?q=${encodeURIComponent(q)}`);
            }
          }}
        />
      </div>

      <div className="flex items-center gap-1">
        {notice && (
          <span className="mr-2 text-xs" style={{ color: "var(--success)" }}>
            {notice}
          </span>
        )}
        {demo && (
          <span
            className="mr-3 rounded px-2 py-1 text-[10px] font-medium"
            style={{
              background: "var(--warning-muted)",
              color: "var(--warning)",
              border: "1px solid rgba(244,183,64,.2)",
            }}
          >
            DEMO
          </span>
        )}
        <button
          type="button"
          aria-label="ข้อความ"
          title="ยังไม่เปิดใช้งาน"
          disabled
          className="flex h-8 w-8 cursor-not-allowed items-center justify-center rounded opacity-40"
          style={{ color: "var(--text-secondary)" }}
        >
          <Mail size={15} />
        </button>
        <button
          type="button"
          aria-label="การแจ้งเตือน"
          title="ดูสต็อกใกล้หมดที่แดชบอร์ด"
          onClick={() => router.push("/")}
          className="flex h-8 w-8 items-center justify-center rounded transition hover:bg-[var(--bg-hover)]"
          style={{ color: "var(--text-secondary)" }}
        >
          <Bell size={15} />
        </button>
        <div className="relative ml-2" ref={menuRef}>
          <button
            type="button"
            aria-label="เมนูผู้ใช้"
            onClick={() => setMenuOpen((v) => !v)}
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
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMenuOpen(false)}
              />
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
      </div>
    </header>
  );
}
