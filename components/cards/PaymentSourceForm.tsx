"use client";

import { useState, useEffect } from "react";
import { PaymentSource } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import {
  createPaymentSource,
  updatePaymentSource,
} from "@/lib/actions/payment-sources";

interface PaymentSourceFormProps {
  source?: PaymentSource;
  onSuccess: () => void;
  trigger?: React.ReactNode;
}

const PRESET_COLORS = [
  "#10b981", // indigo
  "#8b5cf6", // violet
  "#10b981", // emerald
  "#f59e0b", // amber
  "#f43f5e", // rose
  "#3b82f6", // blue
  "#ec4899", // pink
  "#14b8a6", // teal
];

interface FormErrors {
  name?: string;
  type?: string;
  color?: string;
}

export function PaymentSourceForm({ source, onSuccess, trigger }: PaymentSourceFormProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(source?.name ?? "");
  const [type, setType] = useState<"digital" | "cash" | "">(source?.type ?? "");
  const [color, setColor] = useState(source?.color ?? PRESET_COLORS[0]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const isEditing = !!source;

  useEffect(() => {
    if (!open) return;
    setLoading(false);
    setErrors({});
    if (source) {
      setName(source.name);
      setType(source.type);
      setColor(source.color);
    } else {
      setName("");
      setType("");
      setColor(PRESET_COLORS[0]);
    }
  }, [open, source]);

  function validate(): boolean {
    const newErrors: FormErrors = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!type || (type !== "digital" && type !== "cash")) {
      newErrors.type = "Type is required";
    }

    if (!color || !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      newErrors.color = "Select a valid color";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    const payload = {
      name: name.trim(),
      type: type as "digital" | "cash",
      color,
    };

    try {
      const result = isEditing
        ? await updatePaymentSource(source.id, payload)
        : await createPaymentSource(payload);

      if (result.error) {
        toast.error(result.error);
        setLoading(false);
        return;
      }

      toast.success(
        isEditing
          ? `Payment source "${payload.name}" updated`
          : `Payment source "${payload.name}" created`
      );
      setOpen(false);
      onSuccess();
    } catch {
      toast.error("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white hover:bg-[#18122B]">
            <Plus className="h-4 w-4 mr-1" />
            {isEditing ? "Edit" : "Add source"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-[#0f0c19] border-[#18122B]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Payment Source" : "Add Payment Source"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update your payment source details."
                : "Add a new digital wallet or cash source to track spending."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="source-name">Name</Label>
              <Input
                id="source-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                }}
                placeholder="e.g. Mercado Pago, Cash"
                aria-invalid={!!errors.name}
              />
              {errors.name && (
                <p className="text-xs text-rose-400">{errors.name}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="source-type">Type</Label>
              <Select
                value={type || "none"}
                onValueChange={(value) => {
                  setType(value === "none" ? "" : (value as "digital" | "cash"));
                  if (errors.type) setErrors((prev) => ({ ...prev, type: undefined }));
                }}
              >
                <SelectTrigger id="source-type" aria-invalid={!!errors.type}>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select type</SelectItem>
                  <SelectItem value="digital">Digital wallet</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="text-xs text-rose-400">{errors.type}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`h-8 w-8 rounded-full border-2 transition-all ${
                      color === c
                        ? "border-white scale-110"
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: c }}
                    aria-label={`Select color ${c}`}
                  />
                ))}
              </div>
              {errors.color && (
                <p className="text-xs text-rose-400">{errors.color}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : isEditing ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
