import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-lg border border-[#2a2148] bg-[#2a2148] px-3 py-1.5 text-sm text-white transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-white placeholder:text-zinc-400 focus-visible:border-emerald-500/50 focus-visible:ring-2 focus-visible:ring-emerald-500/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-[#191231] disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Input }
