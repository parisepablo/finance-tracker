"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4 text-emerald-400" />
        ),
        info: (
          <InfoIcon className="size-4 text-indigo-400" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4 text-amber-400" />
        ),
        error: (
          <OctagonXIcon className="size-4 text-rose-400" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin text-zinc-400" />
        ),
      }}
      style={
        {
          "--normal-bg": "#18181b",
          "--normal-text": "#fafafa",
          "--normal-border": "rgba(255, 255, 255, 0.06)",
          "--border-radius": "0.625rem",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast border-l-2 border-l-indigo-500",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
