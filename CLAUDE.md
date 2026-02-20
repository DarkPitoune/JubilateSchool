# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

JubilateSchool is a bilingual (French/English) tutoring platform for a math and physics tutoring service. Built with Vite, React 18, React Router 6, and Material-UI 5. Backend powered by Supabase (auth, database, edge functions) with Stripe for payments and Resend for emails.

## Commands

- `npm run dev` — dev server (Vite, port 3000)
- `npm run build` — type-check + production build (outputs to `dist/`)
- `npm run preview` — preview production build

## Architecture

The app has two main areas:

1. **Landing page** (`/`) — scroll-snap marketing site with 5 sections (Welcome, Classes, WhoAmI, Witnesses, ContactCost) in `src/views/`
2. **Platform** (`/app/*`) — authenticated tutoring platform with teacher and student dashboards

`App.tsx` is a `<Routes>` switch with `React.lazy` code-splitting. All platform pages are lazy-loaded. `main.tsx` wraps the app in `BrowserRouter`, `ThemeProvider`, `TranslatorContextProvider`, and `AuthProvider`.

**Booking flow:**
1. Student picks a slot → Stripe authorizes card (no charge) → status = `pending_confirmation`
2. Teacher receives email with confirm/reject links
3. Teacher confirms → Stripe captures payment → both notified → `confirmed`
4. Teacher rejects → authorization released → student notified → `rejected`
5. No response in 48h → auto-cancel via `expire-bookings` function → `expired`
6. Either party cancels → `cancelled_by_student` or `cancelled_by_teacher`:
   - Student can cancel if 48h+ before class → Stripe auth cancelled or refund issued
   - Teacher can cancel any booking at any time → refund issued if already captured

**Key directories:**
- `src/views/` — landing page sections (Welcome, Classes, WhoAmI, Witnesses, ContactCost)
- `src/pages/` — route pages:
  - `src/pages/LandingPage.tsx` — extracted landing page
  - `src/pages/auth/` — LoginPage, RegisterPage, VerifyEmailPage
  - `src/pages/platform/` — PlatformLayout (AppBar + Drawer)
  - `src/pages/platform/teacher/` — TeacherDashboard, AvailabilityManager, StudentList
  - `src/pages/platform/student/` — StudentCalendar, BookingDialog
  - `src/pages/platform/shared/` — BookingsList, BookingSuccess, BookingCancel
- `src/components/` — shared components (Card, theme, useResize, ProtectedRoute, RoleGate, translator system)
- `src/components/translator/` — i18n system using React Context with localStorage persistence
- `src/types/index.ts` — shared TypeScript interfaces (Profile, Booking, AvailabilityRange, Pricing, FreeWindow, AuthContextValue)
- `src/hooks/useQueries.ts` — React Query hooks for data fetching (bookings, availability, pricing, free windows)
- `src/contexts/AuthContext.tsx` — Supabase auth context (`useAuth` hook: session, profile, loading, signOut)
- `src/lib/supabase.ts` — Supabase client instance
- `supabase/migrations/` — SQL schema (profiles, availability_ranges, bookings, pricing + RLS)
- `supabase/functions/` — Deno edge functions (Stripe checkout, webhooks, confirm/reject, email, expiry cron)

**Internationalization:** All user-facing text lives in `src/components/translator/translations.json` (FR & EN, ~130 keys). Use the `useTranslator` hook to access translations. The `LangSwitch` component toggles language.

**Styling:** MUI `sx` prop for responsive styles + custom CSS for scroll-snap and animations. The theme (`src/components/theme.ts`) defines custom breakpoints — the key breakpoint is `sm: 830px` separating mobile/desktop layouts. Typography uses the Kalam handwritten font. Platform pages use `#030340` as the primary dark color.

**Barrel exports:** `src/components/index.ts` and `src/views/index.ts` re-export their contents.

## Routes

```
/                        LandingPage (public)
/login                   LoginPage
/register                RegisterPage
/auth/verify             VerifyEmailPage

/app/                    PlatformLayout (protected, redirects by role)
  /app/dashboard         TeacherDashboard (teacher only)
  /app/availability      AvailabilityManager (teacher only)
  /app/students          StudentList (teacher only)
  /app/calendar          StudentCalendar (student only)
  /app/bookings          BookingsList (both roles)
  /app/booking/success   BookingSuccess
  /app/booking/cancel    BookingCancel
```

## Database (Supabase)

- `profiles` — auto-created on signup via trigger, has `role` ('student'/'teacher'), `timezone`
- `availability_ranges` — teacher's available time blocks
- `bookings` — student bookings with overlap prevention (EXCLUDE constraint), status tracking, Stripe payment intent, `zoom_meeting_link`
  - Statuses: `pending_confirmation`, `confirmed`, `rejected`, `expired`, `payment_failed`, `cancelled_by_student`, `cancelled_by_teacher`
- `pricing` — hourly rate config

RLS uses `public.is_teacher()` SECURITY DEFINER function to avoid infinite recursion when checking teacher role.

## Edge Functions (Deno/TypeScript)

- `create-checkout-session` — validates slot, inserts booking, creates Stripe Checkout (authorize only)
- `stripe-webhook` — handles checkout.session.completed/expired
- `confirm-booking` — teacher email link → captures payment → confirms
- `reject-booking` — teacher email link → cancels auth → rejects
- `cancel-booking` — authenticated cancel by student (48h+ rule) or teacher (anytime) → Stripe cancel/refund → notification emails
- `send-email` — shared Resend utility (bilingual email templates)
- `expire-bookings` — cron: expires stale pending bookings after 48h

## Environment Variables

Frontend (`.env`):
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

Edge Functions (Supabase secrets):
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `SITE_URL`

## Conventions

- All components are functional with hooks (no class components)
- TypeScript (`.ts`/`.tsx`) for all frontend code; Edge Functions are also TypeScript (Deno)
- Shared types live in `src/types/index.ts` — type props, context values, and function signatures; don't over-annotate things TypeScript can infer
- Prefer npm (package-lock.json)
- `npm run build` runs `tsc --noEmit` before `vite build` for type checking
- Code-splitting: all platform pages are lazy-loaded via `React.lazy`
- Data fetching: `@tanstack/react-query` via custom hooks in `src/hooks/useQueries.ts`
- Timezone support: `date-fns-tz` for timezone-aware date handling; profiles store user timezone
- Vendor chunks: MUI, FullCalendar, Supabase, date-fns are separate chunks
- Auth: `ProtectedRoute` for login check, `RoleGate` for role-based access
