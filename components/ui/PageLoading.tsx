import { Card } from "@/components/ui";

export function PageLoadingSkeleton({
  titleWidth = "8rem",
  stats = 4,
  cards = 2,
}: {
  titleWidth?: string;
  stats?: number;
  cards?: number;
}) {
  return (
    <div className="page-loading" aria-busy="true" aria-label="กำลังโหลด">
      <div className="page-loading-header">
        <div
          className="page-loading-block page-loading-title"
          style={{ width: titleWidth }}
        />
        <div className="page-loading-block page-loading-subtitle" />
      </div>

      {stats > 0 && (
        <div className="app-grid-stats mb-6">
          {Array.from({ length: stats }).map((_, index) => (
            <div key={index} className="page-loading-stat" />
          ))}
        </div>
      )}

      {cards > 0 && (
        <div className="page-loading-cards">
          {Array.from({ length: cards }).map((_, index) => (
            <Card key={index} className="page-loading-card">
              <div className="page-loading-block page-loading-card-title" />
              <div className="page-loading-block page-loading-line" />
              <div className="page-loading-block page-loading-line page-loading-line--short" />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
