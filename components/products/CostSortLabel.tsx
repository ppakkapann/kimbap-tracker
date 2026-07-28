"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import type { RecipeCostSort } from "@/lib/recipe-cost-sort";

export function CostSortLabel({
  label = "ต้นทุน",
  sort,
  onToggle,
  className = "",
}: {
  label?: string;
  sort: RecipeCostSort;
  onToggle: () => void;
  className?: string;
}) {
  const Icon = sort === "desc" ? ArrowDown : ArrowUp;
  const hint =
    sort === "desc" ? "เรียงจากแพงไปถูก — กดเพื่อสลับ" : "เรียงจากถูกไปแพง — กดเพื่อสลับ";

  return (
    <button
      type="button"
      className={`cost-sort-label ${className}`.trim()}
      onClick={onToggle}
      aria-label={`${hint} (${label})`}
      title={hint}
    >
      <span>{label}</span>
      <Icon size={13} strokeWidth={2.25} aria-hidden className="cost-sort-label-icon" />
    </button>
  );
}
