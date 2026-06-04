# AGENTS.md

## Project overview
This is a personal finance web application built with Next.js 14 (App Router), Supabase (Postgres + Auth), Tailwind CSS, and shadcn/ui. It is deployed on Vercel.

## Purpose
Help a single user track: monthly income sources, fixed recurring expenses, variable budget categories (percentage-based), and credit card charges (including multi-installment purchases).

## Stack
- **Framework**: Next.js 14, App Router, React Server Components
- **Database**: Supabase (Postgres). Use the Supabase JS client (`@supabase/supabase-js`) for all DB and auth operations. Never use raw fetch against the Supabase REST API.
- **Auth**: Supabase Auth (email/password). The app is single-user but auth is required.
- **Styling**: Tailwind CSS + shadcn/ui components
- **Deployment**: Vercel
- **Language**: TypeScript throughout. No JavaScript files.

## Folder structure
- `app/` — Next.js App Router pages and layouts
- `app/api/` — API route handlers (Route Handlers)
- `components/` — Shared React components
- `components/ui/` — shadcn/ui primitives (do not edit manually)
- `lib/` — Utility functions, Supabase client, type definitions
- `lib/supabase/` — Supabase client setup (server and browser clients)
- `lib/types.ts` — All shared TypeScript types and interfaces
- `lib/utils.ts` — Shared utilities (formatting, calculations)

## Database conventions
- All tables have `id uuid DEFAULT gen_random_uuid() PRIMARY KEY`
- All tables have `user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE`
- All tables have `created_at timestamptz DEFAULT now()`
- All monetary amounts are stored as integers (cents). Display by dividing by 100.
- Percentages are stored as integers (e.g. 10 = 10%)
- Never store computed values — derive them at query time or in application code

## Key business rules
1. Income is defined as monthly net income (after tax). Multiple sources are addable.
2. Fixed expenses are subtracted from total income first, producing the "discretionary pool".
3. Variable budget categories are defined as a percentage of the discretionary pool.
4. Budget percentages should ideally sum to 100%. Warn the user if they don't.
5. A fixed expense can be marked as "paid via credit card" — in that case it must not be double-counted in cash outflows.
6. Credit card charges can be single-payment or multi-installment (cuotas). For installments, each monthly slice is computed and shown separately.
7. Annual/quarterly recurring expenses are stored at their full amount with a billing_cycle field, and displayed as monthly equivalents in all summaries.

## Code style
- Use Server Components by default. Only add `"use client"` when interactivity is required.
- All API routes must validate that the authenticated user owns the resource before any DB operation (RLS is also enabled on all tables).
- Use `lib/types.ts` for all shared types. Do not define types inline in components.
- Format currency using `Intl.NumberFormat` — never manual string concatenation.
- All forms use controlled inputs with React state. No uncontrolled inputs.
- Error states and loading states must always be handled — no silent failures.

## What NOT to do
- Do not use Prisma. Use the Supabase JS client directly.
- Do not use the Pages Router.
- Do not hardcode any Supabase URL or keys — always use environment variables.
- Do not create API routes for operations that can be done safely in Server Components.
- Do not skip Row Level Security (RLS) on any table.
