"use client";

import { useState } from "react";
import { BudgetCategoryWithStats } from "@/lib/types";

interface AllocationBarProps {
  categories: BudgetCategoryWithStats[];
}

export function AllocationBar({ categories }: AllocationBarProps) {
  const [tooltip, setTooltip] = useState<{
    name: string;
    percentage: number;
  } | null>(null);

  const totalAllocated = categories.reduce(
    (sum, cat) => sum + cat.percentage,
    0
  );
  const unallocated = Math.max(0, 100 - totalAllocated);

  return (
    <div className="space-y-2">
      <div className="flex h-8 w-full overflow-hidden rounded-lg">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="relative h-full cursor-pointer transition-opacity hover:opacity-80"
            style={{
              width: `${cat.percentage}%`,
              backgroundColor: cat.color,
            }}
            onMouseEnter={() =>
              setTooltip({ name: cat.name, percentage: cat.percentage })
            }
            onMouseLeave={() => setTooltip(null)}
            title={`${cat.name}: ${cat.percentage}%`}
          />
        ))}
        {unallocated > 0 && (
          <div
            className="h-full bg-muted"
            style={{ width: `${unallocated}%` }}
          />
        )}
      </div>

      {tooltip && (
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">{tooltip.name}</span>
          <span className="text-muted-foreground">{tooltip.percentage}%</span>
        </div>
      )}

      {unallocated > 0 && !tooltip && (
        <p className="text-xs text-muted-foreground">
          {unallocated}% unallocated
        </p>
      )}

      {unallocated === 0 && !tooltip && (
        <p className="text-xs text-muted-foreground">
          100% allocated
        </p>
      )}
    </div>
  );
}
