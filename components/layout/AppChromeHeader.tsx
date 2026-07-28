"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { KimbapMark } from "@/components/brand/KimbapMark";
import { AppNotificationsBell } from "@/components/layout/AppNotificationsBell";
import { AppUserMenu } from "@/components/layout/AppUserMenu";
import type { AppNotification } from "@/lib/notifications";

export function AppChromeHeader({
  demo = false,
  notifications = [],
}: {
  demo?: boolean;
  notifications?: AppNotification[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  if (pathname === "/login") return null;

  return (
    <header className="app-chrome-header">
      <Link href="/" className="app-chrome-header-brand" aria-label="หน้าหลัก">
        <KimbapMark size={28} />
      </Link>

      <div className="app-chrome-header-search">
        <Search size={14} aria-hidden />
        <input
          aria-label="ค้นหา"
          placeholder="ค้นหาวัตถุดิบ (Enter ไปสต็อก)"
          className="app-chrome-header-search-input"
          suppressHydrationWarning
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              const query = event.currentTarget.value.trim();
              if (query) router.push(`/stock?q=${encodeURIComponent(query)}`);
            }
          }}
        />
      </div>

      <div className="app-chrome-header-actions">
        {demo && <span className="app-chrome-header-demo">DEMO</span>}
        <AppNotificationsBell
          notifications={notifications}
          open={notificationsOpen}
          onOpenChange={setNotificationsOpen}
        />
        <AppUserMenu demo={demo} />
      </div>
    </header>
  );
}
