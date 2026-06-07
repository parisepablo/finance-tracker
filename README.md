# Finance Tracker

A personal finance web application to track monthly income, fixed recurring expenses, variable budget categories (percentage-based), and credit card charges including multi-installment purchases.

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org) (App Router, React Server Components)
- **Database**: [Supabase](https://supabase.com) (Postgres + Auth)
- **Auth**: Supabase Auth (email/password)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)
- **Deployment**: [Vercel](https://vercel.com)
- **Language**: TypeScript

## Local Development

### Prerequisites

- Node.js 20+ and npm
- A Supabase project (free tier is fine)

### Setup

1. Clone the repository:

   ```bash
   git clone <repo-url>
   cd finance-app
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy the environment file and fill in your Supabase credentials:

   ```bash
   cp .env.local.example .env.local
   ```

   Open `.env.local` and add the values from your Supabase Dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL` — Project Settings > API > Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Project Settings > API > anon public key
   - `SUPABASE_SERVICE_ROLE_KEY` — Project Settings > API > service role secret
   - `CRON_SECRET` — Generate a random secret with `openssl rand -base64 32`

4. Run the database migration in the Supabase SQL Editor:

   Open `supabase/migrations/001_initial_schema.sql` in the Supabase Dashboard SQL Editor and run it. This creates all tables, indexes, Row Level Security policies, and constraints.

5. Start the development server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Vercel Deployment

1. Push your code to a GitHub/GitLab/Bitbucket repository.
2. Import the repository in the [Vercel Dashboard](https://vercel.com/new).
3. Vercel will auto-detect Next.js.
4. In the project settings, add the **Environment Variables** from your `.env.local` file:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `CRON_SECRET` — Vercel automatically passes this as the Authorization header to cron jobs
5. Deploy.

> Make sure the Supabase project is configured with the same database schema (run the migration SQL in the Supabase SQL Editor before using the app).

## Adding the First User

The app is single-user but requires authentication. You can create the first user in two ways:

### Option A: Supabase Auth Dashboard
1. Go to your Supabase Dashboard > Authentication > Users.
2. Click **Add user** or **Invite user** and create an account with email and password.
3. Visit the deployed app and sign in with those credentials.

### Option B: Via the Login Page
1. If you have a Server Component or API route that creates users, you can seed a user programmatically using the Supabase Admin API.
2. Alternatively, enable email confirmations in Supabase Auth settings and sign up via the `/login` page if you add a sign-up form in the future.

> The current login page at `/login` only supports sign-in. To create a user, use the Supabase Dashboard or add a sign-up flow.

## Project Structure

- `app/` — Next.js App Router pages and layouts
- `app/api/` — API route handlers
- `components/` — Shared React components
- `components/ui/` — shadcn/ui primitives
- `lib/` — Utilities, types, and Supabase clients
- `lib/supabase/` — Server and browser Supabase clients
- `supabase/migrations/` — SQL schema migrations

## Key Business Rules

1. Income is monthly net income (after tax). Multiple sources are addable.
2. Fixed expenses are subtracted from total income first, producing the "discretionary pool".
3. Variable budget categories are defined as a percentage of the discretionary pool.
4. Budget percentages should ideally sum to 100%. The app warns you if they don't.
5. A fixed expense can be marked as "paid via credit card" — in that case it is not double-counted in cash outflows.
6. Credit card charges can be single-payment or multi-installment (cuotas). Each monthly slice is computed and shown separately.
7. Annual/quarterly recurring expenses are stored at their full amount with a `billing_cycle` field, and displayed as monthly equivalents in all summaries.

## Database Conventions

- All tables have `id uuid DEFAULT gen_random_uuid() PRIMARY KEY`
- All tables have `user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE`
- All tables have `created_at timestamptz DEFAULT now()`
- All monetary amounts are stored as integers (cents)
- Percentages are stored as integers (e.g. 10 = 10%)
- Row Level Security (RLS) is enabled on every table

## License

Private — for personal use.
