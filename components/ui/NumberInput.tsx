"use client";

import { useCallback } from "react";
import {
  formatNumberInputDisplay,
  sanitizeNumberInput,
} from "@/lib/calculations";
import { nativeNumberStyle } from "./native-controls";

type NumberInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange"
> & {
  label?: string;
  value?: string | number;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  decimals?: number;
  allowDecimals?: boolean;
  plain?: boolean;
};

export function NumberInput({
  label,
  className = "",
  style,
  value,
  onChange,
  onBlur,
  onFocus,
  decimals = 2,
  allowDecimals = true,
  plain = false,
  inputMode,
  ...props
}: NumberInputProps) {
  const plainValue =
    value === undefined || value === null ? "" : String(value).replace(/,/g, "");
  const displayValue = formatNumberInputDisplay(
    plainValue,
    decimals,
    allowDecimals
  );

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const sanitized = sanitizeNumberInput(
        event.target.value,
        decimals,
        allowDecimals
      );
      onChange?.({
        ...event,
        target: { ...event.target, value: sanitized },
        currentTarget: { ...event.currentTarget, value: sanitized },
      });
    },
    [allowDecimals, decimals, onChange]
  );

  const input = (
    <input
      className={`${plain ? "" : "app-input "}${className} tabular-nums`.trim()}
      type="text"
      inputMode={
        inputMode ?? (allowDecimals && decimals !== 0 ? "decimal" : "numeric")
      }
      autoComplete="off"
      value={displayValue}
      onChange={handleChange}
      onFocus={onFocus}
      onBlur={onBlur}
      style={{ ...nativeNumberStyle, ...style }}
      {...props}
    />
  );

  if (!label) return input;

  return (
    <label className="block space-y-1.5">
      <span className="app-label">{label}</span>
      {input}
    </label>
  );
}
