"use client";

import { Wallet, Receipt, PieChart, CreditCard, BarChart3, Lock, ExternalLink } from "lucide-react";
import { GlowCard } from "@/components/ui/glow-card";
import { AmbientGlow } from "@/components/ui/ambient-glow";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { FadeIn } from "./FadeIn";

const features = [
  {
    icon: Wallet,
    title: "Income Sources",
    description: "Track multiple monthly net income streams.",
    color: "indigo" as const,
  },
  {
    icon: Receipt,
    title: "Fixed Expenses",
    description: "Recurring bills with due dates and billing cycles.",
    color: "violet" as const,
  },
  {
    icon: PieChart,
    title: "Variable Budgets",
    description: "Percentage-based categories of your discretionary pool.",
    color: "emerald" as const,
  },
  {
    icon: CreditCard,
    title: "Credit Cards",
    description: "Track charges, billing cycles, and multi-installment purchases.",
    color: "amber" as const,
  },
  {
    icon: BarChart3,
    title: "Analytics",
    description: "Historical spending, category breakdowns, and utilization.",
    color: "rose" as const,
  },
];

function MockDashboardPreview() {
  return (
    <GlowCard color="indigo" interactive className="w-full max-w-lg mx-auto">
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-32" />
          </div>
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-2 w-full rounded-full" />
            <Skeleton className="h-2 w-16 rounded-full" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-2 w-3/4 rounded-full" />
            <Skeleton className="h-2 w-16 rounded-full" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-2 w-1/2 rounded-full" />
            <Skeleton className="h-2 w-16 rounded-full" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-5 w-16" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-5 w-16" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-5 w-16" />
          </div>
        </div>
      </div>
    </GlowCard>
  );
}

export function LandingPage() {
  return (
    <div className="relative min-h-full overflow-hidden bg-background text-foreground">
      {/* Ambient background glows */}
      <AmbientGlow color="indigo" position="top-left" className="opacity-60" />
      <AmbientGlow color="violet" position="bottom-right" className="opacity-60" />

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center px-6 pt-24 pb-16 text-center">
        <FadeIn delay={0}>
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/15">
              <Wallet className="h-6 w-6 text-indigo-400" />
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-balance">
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-400 bg-clip-text text-transparent">
              Plata
            </span>
          </h1>
        </FadeIn>

        <FadeIn delay={0.2}>
          <p className="mt-4 text-xl md:text-2xl text-muted-foreground text-balance max-w-lg">
            Your money, under control.
          </p>
        </FadeIn>

        <FadeIn delay={0.3}>
          <p className="mt-6 text-sm text-zinc-500 text-balance max-w-md">
            A personal finance tracker built to manage income, fixed expenses, variable budgets,
            credit cards, and spending analytics — all in one dark, distraction-free dashboard.
          </p>
        </FadeIn>
      </section>

      {/* Mock Preview */}
      <section className="relative z-10 px-6 pb-16">
        <FadeIn delay={0.1}>
          <MockDashboardPreview />
        </FadeIn>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 px-6 py-16 max-w-5xl mx-auto">
        <FadeIn delay={0}>
          <h2 className="text-2xl md:text-3xl font-semibold text-center mb-12 text-balance">
            Everything you track
          </h2>
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <FadeIn key={feature.title} delay={index * 0.08}>
                <GlowCard color={feature.color} interactive className="h-full">
                  <div className="p-5 space-y-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10">
                      <Icon className="h-5 w-5 text-indigo-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-white">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </GlowCard>
              </FadeIn>
            );
          })}
        </div>
      </section>

      {/* Personal Project Notice */}
      <section className="relative z-10 flex justify-center px-6 py-12">
        <FadeIn delay={0.1}>
          <Badge
            variant="outline"
            className="text-xs px-4 py-2 border-zinc-700 text-zinc-400 bg-zinc-900/50"
          >
            <Lock className="h-3 w-3 mr-1.5 text-zinc-500" />
            This is a personal project — not open for public sign-up
          </Badge>
        </FadeIn>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.06] px-6 py-8">
        <FadeIn delay={0.1}>
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-zinc-500">
              Plata — a personal finance tracker. Built as a personal project.
            </p>
            <a
              href="https://github.com/parisepablo/finance-tracker"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              View on GitHub
            </a>
          </div>
        </FadeIn>
      </footer>
    </div>
  );
}
