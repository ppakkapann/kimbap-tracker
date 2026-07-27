"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSalesNavHref } from "@/lib/use-sales-nav-href";

const navItems = [
  { href: "/", label: "หน้าหลัก", icon: "◫" },
  { href: "/accounting", label: "บัญชี", icon: "◉" },
  { href: "/sales", label: "ขาย", icon: "＋", highlight: true },
  { href: "/stock", label: "สต็อก", icon: "◧" },
  { href: "/reports", label: "รายงาน", icon: "◈" },
  { href: "/products", label: "เมนู", icon: "◎" },
];

export function BottomNav() {
  const pathname = usePathname();
  const salesHref = useSalesNavHref();

  if (pathname === "/login") return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t md:hidden"
      style={{
        background: "var(--bg-surface)",
        borderColor: "var(--border)",
      }}
    >
      <div className="mx-auto flex max-w-lg items-end justify-around px-2 pb-safe pt-2">
        {navItems.map((item) => {
          const href = item.href === "/sales" ? salesHref : item.href;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : item.href === "/stock"
                ? pathname.startsWith("/stock") ||
                  pathname.startsWith("/ingredients")
                : pathname.startsWith(item.href);

          if (item.highlight) {
            return (
              <Link
                key={item.href}
                href={href}
                className="flex flex-col items-center -mt-4"
              >
                <span
                  className="flex h-13 w-13 items-center justify-center rounded-full text-xl text-white shadow-lg"
                  style={{
                    background: "var(--accent)",
                    boxShadow: "0 4px 20px rgba(249, 115, 22, 0.35)",
                    width: "3.25rem",
                    height: "3.25rem",
                  }}
                >
                  {item.icon}
                </span>
                <span className="mt-1 text-xs font-medium" style={{ color: "var(--accent)" }}>
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={href}
              className="flex flex-col items-center px-2 py-1"
              style={{ color: isActive ? "var(--accent)" : "var(--text-muted)" }}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
