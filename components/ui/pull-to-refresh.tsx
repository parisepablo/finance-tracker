"use client";

interface PullToRefreshIndicatorProps {
  progress: number;
  isRefreshing: boolean;
}

export function PullToRefreshIndicator({
  progress,
  isRefreshing,
}: PullToRefreshIndicatorProps) {
  const visible = progress > 0 || isRefreshing;
  const width = isRefreshing ? 100 : Math.min(progress * 100, 100);

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[60] h-[3px] transition-opacity duration-200"
      style={{
        opacity: visible ? 1 : 0,
        pointerEvents: "none",
      }}
    >
      <div
        className="h-full bg-emerald-500 transition-[width] duration-150 ease-out"
        style={{
          width: `${width}%`,
          animation: isRefreshing ? "pulse-emerald 1s infinite" : "none",
        }}
      />
    </div>
  );
}
