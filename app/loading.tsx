import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <Skeleton className="h-8 w-48" />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-white/[0.06] bg-zinc-900/60 p-6 space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-28" />
          </div>
        ))}
      </div>

      <Skeleton className="h-6 w-32" />
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-white/[0.06] bg-zinc-900/60 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>

      <Skeleton className="h-6 w-40" />
      <div className="space-y-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-white/[0.06] bg-zinc-900/60 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        ))}
      </div>

      <Skeleton className="h-6 w-24" />
      <div className="space-y-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-white/[0.06] bg-zinc-900/60 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
