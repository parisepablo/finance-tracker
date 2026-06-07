import { cn } from "@/lib/utils";

interface AmbientGlowProps {
  color?: "indigo" | "violet" | "emerald" | "amber" | "rose";
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left" | "center";
  className?: string;
}

const colorMap = {
  indigo: "rgba(99, 102, 241, 0.08)",
  violet: "rgba(139, 92, 246, 0.08)",
  emerald: "rgba(16, 185, 129, 0.08)",
  amber: "rgba(245, 158, 11, 0.08)",
  rose: "rgba(244, 63, 94, 0.08)",
};

const positionMap = {
  "top-right": { top: "-10%", right: "-10%", left: "auto", bottom: "auto" },
  "top-left": { top: "-10%", left: "-10%", right: "auto", bottom: "auto" },
  "bottom-right": { bottom: "-10%", right: "-10%", top: "auto", left: "auto" },
  "bottom-left": { bottom: "-10%", left: "-10%", top: "auto", right: "auto" },
  center: { top: "50%", left: "50%", transform: "translate(-50%, -50%)" },
};

export function AmbientGlow({
  color = "indigo",
  position = "top-right",
  className,
}: AmbientGlowProps) {
  const pos = positionMap[position];
  const glowColor = colorMap[color];

  return (
    <div
      className={cn("fixed pointer-events-none z-0 blur-3xl", className)}
      style={{
        width: "600px",
        height: "600px",
        background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
        ...pos,
      }}
    />
  );
}
