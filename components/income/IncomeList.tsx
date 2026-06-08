"use client";

import { useState } from "react";
import { IncomeSource } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Amount } from "@/components/ui/amount";
import { GlowCard } from "@/components/ui/glow-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SwipeableRow } from "@/components/ui/swipeable-row";
import { SwipeableRowProvider } from "@/components/ui/swipeable-row-context";
import { IncomeForm } from "./IncomeForm";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { toast } from "sonner";
import { Pencil, Trash2, Banknote } from "lucide-react";
import { haptics } from "@/lib/haptics";

interface IncomeListProps {
  incomeSources: IncomeSource[];
  onRefresh: () => void;
}

export function IncomeList({ incomeSources, onRefresh }: IncomeListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmItem, setConfirmItem] = useState<IncomeSource | null>(null);
  const [editingItem, setEditingItem] = useState<IncomeSource | null>(null);

  function openDeleteDialog(item: IncomeSource) {
    setConfirmItem(item);
    setConfirmOpen(true);
    setError(null);
    haptics.medium();
  }

  async function handleDelete() {
    if (!confirmItem) return;

    setDeletingId(confirmItem.id);
    setError(null);

    try {
      const res = await fetch(`/api/income/${confirmItem.id}`, { method: "DELETE" });
      const result = await res.json();

      if (!res.ok) {
        setError(result.error || "Failed to delete income source");
        toast.error(result.error || "Failed to delete income source");
        setDeletingId(null);
        return;
      }

      toast.success(`Income source "${confirmItem.name}" deleted`);
      haptics.light();
      setConfirmOpen(false);
      setConfirmItem(null);
      onRefresh();
    } catch {
      setError("Network error. Please try again.");
      toast.error("Network error. Please try again.");
      setDeletingId(null);
    }
  }

  if (incomeSources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-zinc-800 p-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
          <Banknote className="h-6 w-6 text-zinc-600" />
        </div>
        <div className="space-y-1">
          <p className="font-medium text-zinc-300">No income sources yet</p>
          <p className="text-sm text-zinc-500">
            Add your first income source to get started.
          </p>
        </div>
        <IncomeForm onSuccess={onRefresh} />
      </div>
    );
  }

  return (
    <SwipeableRowProvider>
      <div className="space-y-3">
        {error && (
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
            {error}
          </div>
        )}

        {incomeSources.map((source) => (
          <SwipeableRow
            key={source.id}
            rowId={source.id}
            onEdit={() => setEditingItem(source)}
            onDelete={() => openDeleteDialog(source)}
          >
            <GlowCard
              color="indigo"
              interactive
              className={!source.is_active ? "opacity-60" : undefined}
            >
              <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-200">{source.name}</span>
                    <Badge variant={source.is_active ? "default" : "secondary"}>
                      {source.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {source.currency}
                    </Badge>
                  </div>
                  <p className="text-lg font-semibold text-white tabular-nums font-mono">
                    <Amount value={source.amount_cents} currency={source.currency} className="font-mono" />
                    <span className="ml-1 text-sm font-normal text-zinc-500 font-sans">
                      / month
                    </span>
                  </p>
                </div>

                <div className="hidden md:flex items-center gap-1">
                  <IncomeForm
                    income={source}
                    onSuccess={onRefresh}
                    open={editingItem?.id === source.id}
                    onOpenChange={(open) => {
                      if (!open) setEditingItem(null);
                    }}
                    trigger={
                      <Button variant="ghost" size="icon" aria-label="Edit" className="min-h-[44px] min-w-[44px] text-zinc-500 hover:text-white hover:bg-zinc-800">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete"
                    disabled={deletingId === source.id}
                    onClick={() => openDeleteDialog(source)}
                    className="min-h-[44px] min-w-[44px] text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </GlowCard>
          </SwipeableRow>
        ))}

        <DeleteConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          onConfirm={handleDelete}
          title="Delete Income Source"
          description="This will permanently delete"
          itemName={confirmItem?.name ?? ""}
          isLoading={!!deletingId}
        />
      </div>
    </SwipeableRowProvider>
  );
}
