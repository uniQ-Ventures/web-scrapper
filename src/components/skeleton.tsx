export function SkeletonLine({ width = "100%" }: { width?: string }) {
  return (
    <div
      style={{
        height: 16,
        width,
        borderRadius: "var(--radius-sm)",
        background: "var(--bg-tertiary, rgba(255,255,255,0.06))",
        animation: "pulse 1.5s ease-in-out infinite",
      }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-color)",
        borderRadius: "var(--radius-lg)",
        padding: 24,
        display: "flex",
        flexDirection: "column" as const,
        gap: 12,
      }}
    >
      <SkeletonLine width="40%" />
      <SkeletonLine width="60%" />
      <SkeletonLine width="80%" />
    </div>
  );
}

export function SkeletonKPI() {
  return (
    <div className="kpi-card" style={{ opacity: 0.6 }}>
      <div style={{
        width: 36,
        height: 36,
        borderRadius: "var(--radius)",
        background: "var(--bg-tertiary, rgba(255,255,255,0.06))",
        animation: "pulse 1.5s ease-in-out infinite",
        marginBottom: 16,
      }} />
      <SkeletonLine width="50%" />
      <div style={{ height: 8 }} />
      <SkeletonLine width="70%" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" as const, gap: 12, padding: 20 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{ display: "flex", gap: 16, alignItems: "center" }}
        >
          <SkeletonLine width="30%" />
          <SkeletonLine width="20%" />
          <SkeletonLine width="25%" />
          <SkeletonLine width="15%" />
        </div>
      ))}
    </div>
  );
}
