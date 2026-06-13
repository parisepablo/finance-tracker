import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-40" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[#18122B] bg-[#0f0c19] p-6 space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-28" />
          </div>
        ))}
      </div>

      <div className="space-y-6">
        {Array.from({ length: 2 }).map((_, g) => (
          <div key={g} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-[#18122B] bg-[#0f0c19] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
