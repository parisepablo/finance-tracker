"use client"

import { useVisibility } from "@/components/visibility-provider";
import { Eye, EyeOff } from "lucide-react";

export function VisibilityToggle() {
  const { valuesVisible, toggleVisibility } = useVisibility();
  return (
    <button
      onClick={toggleVisibility}
      className="p-2 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
      aria-label={valuesVisible ? "Hide values" : "Show values"}
    >
      {valuesVisible ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
    </button>
  );
}
