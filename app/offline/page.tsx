import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 p-6 text-center bg-background">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#18122B]">
        <WifiOff className="h-8 w-8 text-zinc-500" />
      </div>
      <div className="space-y-2">
        <h1 className="text-lg font-semibold text-white">You&apos;re offline</h1>
        <p className="text-sm text-zinc-500">
          Open the app with a connection to sync your data.
        </p>
      </div>
    </div>
  );
}
