"use client";

import { Select } from "@/components/ui";
import type { IngredientUnit } from "@/lib/types";
import { UNIT_LABELS } from "@/lib/types";
import {
  getUnitFamily,
  purchasableUnitsFor,
  type UnitFamily,
} from "@/lib/unit-conversion";

const STORAGE_UNITS: IngredientUnit[] = ["g", "ml", "piece"];

export function UnitPicker({
  value,
  onChange,
  label = "หน่วยพื้นฐาน",
  mode = "storage",
  family,
}: {
  value: IngredientUnit;
  onChange: (unit: IngredientUnit) => void;
  label?: string;
  mode?: "storage" | "purchase";
  family?: UnitFamily;
}) {
  const options =
    mode === "purchase"
      ? purchasableUnitsFor(family ?? getUnitFamily(value))
      : STORAGE_UNITS;

  return (
    <Select
      label={label}
      value={value}
      onChange={(event) => onChange(event.target.value as IngredientUnit)}
    >
      {options.map((unitValue) => (
        <option key={unitValue} value={unitValue}>
          {UNIT_LABELS[unitValue]}
        </option>
      ))}
    </Select>
  );
}
