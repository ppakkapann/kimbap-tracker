"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  Bell,
  CircleAlert,
  Info,
} from "lucide-react";
import type { AppNotification, NotificationSeverity } from "@/lib/notifications";

function NotificationIcon({ severity }: { severity: NotificationSeverity }) {
  if (severity === "danger") {
    return <CircleAlert size={16} strokeWidth={2} aria-hidden />;
  }
  if (severity === "warning") {
    return <AlertTriangle size={16} strokeWidth={2} aria-hidden />;
  }
  return <Info size={16} strokeWidth={2} aria-hidden />;
}

export function AppNotificationsBell({
  notifications,
  open,
  onOpenChange,
}: {
  notifications: AppNotification[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const notificationCount = notifications.length;
  const criticalCount = notifications.filter(
    (item) => item.severity === "danger"
  ).length;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onOpenChange]);

  function close() {
    onOpenChange(false);
  }

  const panel =
    open && mounted ? (
      <div
        className="app-notifications-overlay"
        onClick={close}
        role="presentation"
      >
        <div
          className="app-notifications-panel"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="การแจ้งเตือน"
        >
          <span className="app-notifications-panel-handle" aria-hidden />

          <div className="app-header-notifications-head">
            <strong>การแจ้งเตือน</strong>
            <span>{notificationCount} รายการ</span>
          </div>

          {notificationCount === 0 ? (
            <div className="app-header-notifications-empty">
              <strong>ไม่มีอะไรต้องรีบทำตอนนี้</strong>
              <span>สต็อกและเมนูอยู่ในระดับปกติ</span>
            </div>
          ) : (
            <ul className="app-header-notifications-list">
              {notifications.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className={`app-header-notification app-header-notification--${item.severity}`}
                    onClick={close}
                  >
                    <span className="app-header-notification-icon">
                      <NotificationIcon severity={item.severity} />
                    </span>
                    <span className="app-header-notification-body">
                      <strong>{item.title}</strong>
                      <span>{item.message}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {notificationCount > 0 && (
            <div className="app-header-notifications-foot">
              <Link href="/stock" className="app-link" onClick={close}>
                ไปจัดการสต็อก →
              </Link>
            </div>
          )}
        </div>
      </div>
    ) : null;

  return (
    <>
      <button
        type="button"
        aria-label="การแจ้งเตือน"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        className={`app-header-bell${notificationCount > 0 ? " has-alerts" : ""}${
          criticalCount > 0 ? " has-critical" : ""
        }`}
      >
        <Bell size={17} />
        {notificationCount > 0 ? (
          <span className="app-header-bell-badge" aria-hidden>
            {notificationCount > 99 ? "99+" : notificationCount}
          </span>
        ) : null}
      </button>

      {panel ? createPortal(panel, document.body) : null}
    </>
  );
}
