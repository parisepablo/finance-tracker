import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-indigo-500/50 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default:
          "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
        secondary:
          "bg-zinc-800 text-zinc-400 border-white/[0.06]",
        destructive:
          "bg-rose-500/15 text-rose-400 border-rose-500/20",
        outline:
          "border-white/[0.08] text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200",
        warning:
          "bg-amber-500/15 text-amber-400 border-amber-500/20",
        success:
          "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
        ghost:
          "hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
