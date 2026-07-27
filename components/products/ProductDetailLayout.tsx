import type { ReactNode } from "react";

export function ProductDetailLayout({
  stats,
  menu,
  recipe,
}: {
  stats: ReactNode;
  menu: ReactNode;
  recipe: ReactNode;
}) {
  return (
    <div className="product-detail-layout">
      <div className="product-detail-stats">{stats}</div>
      <div className="product-detail-menu">{menu}</div>
      <div className="product-detail-recipe">{recipe}</div>
    </div>
  );
}
