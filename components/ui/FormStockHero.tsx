import type { ReactNode } from "react";
import { formatStockAmount } from "@/lib/calculations";
import { NumberInput } from "./NumberInput";

function stockInputWidth(value: number): string {
  const chars = Math.max(3, formatStockAmount(value).length);
  return `${chars + 0.5}ch`;
}

export function FormStockHero({
  label = "สต็อกปัจจุบัน",
  unit,
  value,
  editable = false,
  onChange,
  after,
}: {
  label?: string;
  unit: string;
  value: number;
  editable?: boolean;
  onChange?: (value: number) => void;
  after?: ReactNode;
}) {
  return (
    <div className="app-stat form-stock-hero">
      <p className="app-stat-label">{label}</p>
      <div className="form-stock-amount">
        <span className="form-stock-amount-inner">
          {editable && onChange ? (
            <NumberInput
              value={value}
              onChange={(event) => onChange(Number(event.target.value) || 0)}
              className="form-stock-amount-input"
              style={{ width: stockInputWidth(value) }}
              aria-label={`${label} (${unit})`}
              allowDecimals
              decimals={2}
              plain
            />
          ) : (
            <span className="form-stock-amount-value">
              {formatStockAmount(value)}
            </span>
          )}
          <span className="form-stock-amount-unit">{unit}</span>
        </span>
      </div>
      {after}
    </div>
  );
}
