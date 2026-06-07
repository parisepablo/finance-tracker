"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface FabProps {
  onClick: () => void;
}

export function Fab({ onClick }: FabProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "fixed z-40 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg transition-all duration-200 ease-out",
        "hover:bg-indigo-500 hover:scale-[1.08] active:scale-95",
        "bottom-20 right-4 md:bottom-6 md:right-6"
      )}
      style={{
        boxShadow: isHovered
          ? "0 0 30px rgba(99,102,241,0.5), 0 8px 24px rgba(0,0,0,0.4)"
          : "0 0 20px rgba(99,102,241,0.4), 0 4px 16px rgba(0,0,0,0.3)",
      }}
      aria-label="Add card charge"
    >
      <Plus className="h-6 w-6" />
    </button>
  );
}
