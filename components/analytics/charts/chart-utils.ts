export const CHART_COLORS = {
  income: "#10b981",
  spending: "#f43f5e",
  fixed: "#f59e0b",
  creditCard: "#06b6d4",
  cash: "#8b5cf6",
  savings: "#34d399",
  deficit: "#f43f5e",
  single: "#10b981",
  installment: "#06b6d4",
  grid: "#27272a",
  tick: "#71717a",
  tooltipBg: "#18122B",
  tooltipBorder: "#231c3d",
  palette: [
    "#10b981", // emerald
    "#06b6d4", // cyan
    "#8b5cf6", // violet
    "#f59e0b", // amber
    "#ec4899", // pink
    "#34d399", // light emerald
    "#f43f5e", // rose
    "#3b82f6", // blue
    "#a855f7", // purple
    "#14b8a6", // teal
  ],
};

export function getColor(index: number): string {
  return CHART_COLORS.palette[index % CHART_COLORS.palette.length];
}
