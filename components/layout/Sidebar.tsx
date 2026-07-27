"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { KimbapMark } from "@/components/brand/KimbapMark";
import { useSalesNavHref } from "@/lib/use-sales-nav-href";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  CookingPot,
  LayoutDashboard,
  Wallet,
} from "lucide-react";

const navItems = [
  { href: "/", label: "แดชบอร์ด", icon: LayoutDashboard },
  { href: "/stock", label: "สต็อก", icon: Boxes },
  { href: "/sales", label: "ยอดขาย", icon: ClipboardList },
  { href: "/products", label: "เมนู", icon: CookingPot },
  { href: "/accounting", label: "บัญชี", icon: Wallet },
  { href: "/reports", label: "รายงาน", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();
  const salesHref = useSalesNavHref();

  if (pathname === "/login") return null;

  return (
    <aside
      className="absolute inset-y-0 left-0 z-40 hidden w-[var(--sidebar-width)] flex-col border-r md:flex"
      style={{
        background: "var(--bg-surface)",
        borderColor: "var(--border)",
      }}
    >
      <div
        className="flex h-[var(--header-height)] items-center justify-center border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <Link href="/" title="แดชบอร์ด">
          <KimbapMark size={30} />
        </Link>
      </div>

      <nav className="flex-1 space-y-2 px-2 py-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const href = item.href === "/sales" ? salesHref : item.href;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : item.href === "/stock"
                ? pathname.startsWith("/stock") ||
                  pathname.startsWith("/ingredients")
                : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={href}
              title={item.label}
              aria-label={item.label}
              className="group relative flex h-9 items-center justify-center rounded-md transition"
              style={{
                background: isActive ? "var(--accent-muted)" : "transparent",
                color: isActive ? "var(--accent)" : "var(--text-secondary)",
              }}
            >
              <Icon size={16} strokeWidth={1.8} />
              <span
                className="pointer-events-none absolute left-full z-50 ml-3 hidden whitespace-nowrap rounded px-2 py-1 text-xs shadow-xl group-hover:block"
                style={{
                  background: "var(--bg-hover)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-2" style={{ borderColor: "var(--border)" }}>
        <Link
          href={salesHref}
          className="flex h-9 items-center justify-center rounded-md text-lg text-white"
          title="บันทึกยอดขาย"
          style={{ background: "var(--accent)" }}
        >
          ＋
        </Link>
      </div>
    </aside>
  );
}
