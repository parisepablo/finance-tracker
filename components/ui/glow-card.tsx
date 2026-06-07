import * as React from "react";
import { cn } from "@/lib/utils";

const glowColors = {
  indigo: {
    from: "rgba(99, 102, 241, 0.5)",
    to: "rgba(139, 92, 246, 0.3)",
    hoverFrom: "rgba(99, 102, 241, 0.5)",
    hoverTo: "rgba(139, 92, 246, 0.5)",
  },
  violet: {
    from: "rgba(139, 92, 246, 0.5)",
    to: "rgba(168, 85, 247, 0.3)",
    hoverFrom: "rgba(139, 92, 246, 0.5)",
    hoverTo: "rgba(168, 85, 247, 0.5)",
  },
  emerald: {
    from: "rgba(16, 185, 129, 0.5)",
    to: "rgba(52, 211, 153, 0.3)",
    hoverFrom: "rgba(16, 185, 129, 0.5)",
    hoverTo: "rgba(52, 211, 153, 0.5)",
  },
  amber: {
    from: "rgba(245, 158, 11, 0.5)",
    to: "rgba(251, 191, 36, 0.3)",
    hoverFrom: "rgba(245, 158, 11, 0.5)",
    hoverTo: "rgba(251, 191, 36, 0.5)",
  },
  rose: {
    from: "rgba(244, 63, 94, 0.5)",
    to: "rgba(251, 113, 133, 0.3)",
    hoverFrom: "rgba(244, 63, 94, 0.5)",
    hoverTo: "rgba(251, 113, 133, 0.5)",
  },
};

type GlowColor = keyof typeof glowColors;

interface GlowCardProps extends React.HTMLAttributes<HTMLDivElement> {
  color?: GlowColor;
  hoverIntensity?: "subtle" | "medium" | "strong";
  children: React.ReactNode;
}

export function GlowCard({
  color = "indigo",
  hoverIntensity = "medium",
  children,
  className,
  ...props
}: GlowCardProps) {
  const colors = glowColors[color];

  const intensityMap = {
    subtle: { from: "8px", to: "16px" },
    medium: { from: "20px", to: "40px" },
    strong: { from: "30px", to: "60px" },
  };

  const intensities = intensityMap[hoverIntensity];

  return (
    <div
      className={cn(
        "group relative rounded-xl transition-all duration-300 ease-out",
        "hover:-translate-y-0.5 cursor-pointer",
        className
      )}
      style={{
        background: `linear-gradient(#18181b, #18181b) padding-box, linear-gradient(135deg, ${colors.from}, transparent 50%, ${colors.to}) border-box`,
        border: "1px solid transparent",
        boxShadow: "none",
        transition: "all 0.3s ease, transform 0.2s ease",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.boxShadow = `0 0 ${intensities.from} -5px ${colors.hoverFrom}, 0 0 ${intensities.to} -10px ${colors.hoverTo}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
      }}
      {...props}
    >
      {children}
    </div>
  );
}
