import type { CSSProperties } from "react";

/** Inline fallback — Lightning CSS drops -webkit-appearance when appearance is also set. */
export const nativeSelectStyle: CSSProperties = {
  WebkitAppearance: "none",
  MozAppearance: "none",
};

export const nativeNumberStyle: CSSProperties = {
  MozAppearance: "textfield",
};
