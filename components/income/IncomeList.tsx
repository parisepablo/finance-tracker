"use client";

import { useState } from "react";
import { IncomeSource } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IncomeForm } from "./IncomeForm";
import { Pencil, Trash2 } from "lucide-react";

interface IncomeListProps {
  incomeSources: IncomeSource[];
  onRefresh: () => void;
}

export function IncomeList({ incomeSources, onRefresh }: IncomeListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this income source?")) {
      return;
    }

    setDeletingId(id);
    setError(null);

    try {
      const res = await fetch(`/api/income/${id}`, { method: "DELETE" });
      const result = await res.json();

      if (!res.ok) {
        setError(result.error || "Failed to delete income source");
        setDeletingId(null);
        return;
      }

      onRefresh();
    } catch {
      setError("Network error. Please try again.");
      setDeletingId(null);
    }
  }

  if (incomeSources.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        <p>No income sources yet.</p>
        <p className="text-sm">Add your first income source to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      {incomeSources.map((source) => (
        <Card
          key={source.id}
          className={!source.is_active ? "opacity-50" : undefined}
        >
          <CardContent className="flex items-center justify-between p-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{source.name}</span>
                <Badge variant={source.is_active ? "default" : "secondary"}>
                  {source.is_active ? "Active" : "Inactive"}
                </Badge>
                <Badge variant="outline">{source.currency}</Badge>
              </div>
              <p className="text-lg font-semibold text-foreground">
                {formatCurrency(source.amount_cents, source.currency)}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  / month
                </span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <IncomeForm
                income={source}
                onSuccess={onRefresh}
                trigger={
                  <Button variant="ghost" size="icon" aria-label="Edit">
                    <Pencil className="h-4 w-4" />
                  </Button>
                }
              />
              <Button
                variant="ghost"
                size="icon"
                aria-label="Delete"
                disabled={deletingId === source.id}
                onClick={() => handleDelete(source.id)}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
