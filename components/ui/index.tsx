import { type ReactNode } from "react";
import Link from "next/link";
import { nativeSelectStyle } from "./native-controls";
import { DatePicker } from "./DatePicker";
import { NumberInput } from "./NumberInput";

export { AppModal } from "./AppModal";
export { DatePicker } from "./DatePicker";
export { DateRangeCalendar } from "./DateRangeCalendar";
export { NumberInput } from "./NumberInput";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`app-card ${className}`}>{children}</div>;
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  const variants = {
    primary: "app-btn-primary",
    secondary: "app-btn-secondary",
    danger: "app-btn-danger",
    ghost: "app-btn-ghost",
  };

  return (
    <button className={`app-btn ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Input({
  label,
  className = "",
  style,
  type,
  decimals,
  allowDecimals,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  decimals?: number;
  allowDecimals?: boolean;
}) {
  if (type === "number") {
    const { value, ...numberProps } = props;

    return (
      <NumberInput
        label={label}
        className={className}
        style={style}
        decimals={decimals}
        allowDecimals={allowDecimals}
        value={value as string | number | undefined}
        {...numberProps}
      />
    );
  }

  return (
    <label className="block space-y-1.5">
      {label && <span className="app-label">{label}</span>}
      <input
        className={`app-input ${className}`}
        type={type}
        style={style}
        {...props}
      />
    </label>
  );
}

export function Select({
  label,
  children,
  className = "",
  style,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <label className="block space-y-1.5">
      {label && <span className="app-label">{label}</span>}
      <select
        className={`app-input ${className}`}
        style={{ ...nativeSelectStyle, ...style }}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

export function SegmentToggle<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className = "",
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      className={`app-segment-toggle ${className}`}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          aria-pressed={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={`app-segment-btn${
            value === opt.value ? " app-segment-btn--active" : ""
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex items-start justify-between gap-4">
      <div>
        <h1 className="app-title">{title}</h1>
        {subtitle && <p className="app-subtitle mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  subValue,
  variant = "default",
  subVariant,
  className,
}: {
  label: string;
  value: string;
  subValue?: string;
  variant?: "default" | "success" | "warning" | "danger" | "accent";
  subVariant?: "default" | "success" | "warning" | "danger" | "accent";
  className?: string;
}) {
  const colors: Record<string, string> = {
    default: "var(--text-primary)",
    success: "var(--success)",
    warning: "var(--warning)",
    danger: "var(--danger)",
    accent: "var(--accent)",
  };

  return (
    <div className={className ? `app-stat ${className}` : "app-stat"}>
      <p className="app-stat-label">{label}</p>
      <p className="app-stat-value" style={{ color: colors[variant] }}>
        {value}
      </p>
      {subValue && (
        <p
          className="app-stat-subvalue"
          style={{
            color: subVariant ? colors[subVariant] : "var(--text-muted)",
          }}
        >
          {subValue}
        </p>
      )}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <div className="app-empty">{message}</div>;
}

export function Badge({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger";
}) {
  return (
    <span className={`app-badge app-badge-${variant}`}>{children}</span>
  );
}

export function QuickLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
}) {
  return (
    <Link
      href={href}
      className={`app-btn flex-1 text-center ${variant === "primary" ? "app-btn-primary" : "app-btn-secondary"}`}
    >
      {children}
    </Link>
  );
}

export function SectionTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="app-section-title">{title}</h2>
        {description && (
          <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
