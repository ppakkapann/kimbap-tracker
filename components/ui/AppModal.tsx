"use client";

import { useEffect, useId, type ReactNode } from "react";
import { createPortal } from "react-dom";

type AppModalSize = "sm" | "md" | "lg";

export function AppModal({
  open,
  onClose,
  title,
  subtitle,
  children,
  size = "md",
  footer,
  ariaLabel,
  bodyClassName = "",
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  size?: AppModalSize;
  footer?: ReactNode;
  ariaLabel?: string;
  bodyClassName?: string;
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="app-modal-overlay" onClick={onClose} role="presentation">
      <div
        className={`app-modal-panel app-modal-panel--${size}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={!title ? ariaLabel : undefined}
      >
        <span className="app-modal-handle" aria-hidden />

        {(title || subtitle) && (
          <header className="app-modal-head">
            <div className="app-modal-head-text min-w-0">
              {title ? (
                <h2 id={titleId} className="app-modal-title">
                  {title}
                </h2>
              ) : null}
              {subtitle ? (
                <p className="app-modal-subtitle">{subtitle}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="app-modal-close"
              aria-label="ปิด"
            >
              ×
            </button>
          </header>
        )}

        <div className={`app-modal-body ${bodyClassName}`.trim()}>{children}</div>

        {footer ? <footer className="app-modal-foot">{footer}</footer> : null}
      </div>
    </div>,
    document.body
  );
}
