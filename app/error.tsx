"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/15">
        <AlertTriangle className="h-6 w-6 text-rose-400" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-white">Something went wrong</h2>
        <p className="text-sm text-zinc-500">
          We couldn&apos;t load this page. Please try again.
        </p>
      </div>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
