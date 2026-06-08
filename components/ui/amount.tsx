"use client"

import { useVisibility } from "@/components/visibility-provider"

type AmountProps = {
  value: number
  currency?: "ARS" | "USD"
  className?: string
}

export function Amount({ value, currency = "ARS", className }: AmountProps) {
  const { valuesVisible } = useVisibility()

  if (!valuesVisible) {
    return <span className={className}>••••••</span>
  }

  const locale = currency === "USD" ? "en-US" : "es-AR"
  const formatted = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(value / 100)

  return <span className={className}>{formatted}</span>
}
