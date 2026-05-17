# Classroom Finance 5 Project Timeline

Generated: 2026-05-17

This timeline summarizes the evolution of Classroom Finance 5 from the early documented MVP to the current LINE-enabled payment review system. It is based on the repository README, project documentation, Supabase migrations, and Git commit history.

## Timeline

### Early project baseline: Classroom finance MVP

The project began as a classroom treasurer web app focused on four core areas: dashboard, transactions, schedules, and students. The early implementation used Next.js, React, TypeScript, Tailwind CSS, Zustand state, Recharts, Framer Motion, and form validation with React Hook Form and Zod.

Key result: the app could manage classroom financial records, student payment schedules, and basic reporting through a responsive web UI.

### MVP hardening: UX and Supabase readiness

The documented 5.0 implementation added production-minded UX and backend preparation: Quick Pay, edit restrictions for schedule-generated transactions, empty states, loading skeletons, error boundaries, Supabase CRUD helpers, SWR hooks, and a mapping layer between database snake_case and UI camelCase fields.

Key result: the project moved from a functional UI prototype toward a maintainable app with a planned database migration path.

### 2025-12-22: Deployed Classroom Finance 5 project

The first Git commit in the current repository history is `2ee4de0`, "Deploy updated classroom-finance-5 project." This marks the start of the tracked project history used for this timeline.

Key result: the project entered a deployment-oriented repository state.

### 2026-05-08: GitHub and Vercel deployment preparation

Commits on this date prepared the app for GitHub and Vercel deployment, merged remote work, removed merge leftovers, and fixed the Vercel cron schedule for the Hobby plan.

Key result: the project became easier to deploy and operate on Vercel.

### 2026-05-09: LINE bot and payment workflow expansion

This was the largest feature-growth day in the commit history. The project added mobile UI improvements, LINE schedule reminders, rich menu payment flows, setup fixes, payment cancel support, transaction edit access, registration locking, quieter handling for non-command LINE messages, polished bot messages, status and history menus, Flex schedule notifications, inline transaction editing, QR and amount handling in the webhook, automated slip deletion, remaining-balance notifications, advanced student filtering, sorting, and bulk LINE reminders.

Key result: Classroom Finance expanded from an admin web app into a student-facing LINE payment system.

### 2026-05-13: Payment request approval workflow

The project added a payment request approval workflow with a notification list UI, fixed Next.js type references, corrected student name property access, and added project agent guide documentation for development workflows.

Key result: ambiguous or incomplete LINE payment slips could be reviewed in the web app instead of being treated as automatic ledger entries.

### 2026-05-16: Project-specific engineering skills

The repository added Classroom Finance Specialist and Database Migration skills to encode project standards, workflows, and migration practices for future development.

Key result: development guidance became part of the repository itself.

### 2026-05-17: Current payment review and retention system

Recent commits enhanced approval and rejection actions in the UI, refactored payment selection, simplified student status displays, added slip transaction ID handling, improved account normalization and transaction ID extraction, archived approved LINE payment slips, enhanced retention logic, added deletion for rejected slip images and completed requests, removed unused slip images and test scripts, and refreshed the README.

Key result: the project now separates pending LINE payment requests from finalized transactions and treats payment correctness conservatively.

## Present State

Classroom Finance 5 is now a Next.js 16 App Router application with React 19 and Tailwind CSS v4. Supabase Postgres is the primary database, Supabase Storage stores private payment slips, Vercel Blob stores general uploaded images, and the LINE Messaging API powers student registration, debt lookup, payment selection, slip submission, reminders, and notifications.

The current design intentionally protects the ledger: finalized money movement lives in `transactions`, while payment selection, waiting-for-slip, and review states live in `line_payment_requests`.

## Major Evolution

1. Admin-only classroom finance UI.
2. Supabase-ready data and storage architecture.
3. Vercel deployment and cron operations.
4. LINE student registration, reminders, rich menus, and payment sessions.
5. Web-based payment request review and notification workflow.
6. Slip checking, archiving, deletion, and retention hardening.
7. Project documentation and engineering workflow standardization.

## Sources Used

- `README.md`
- `docs/PROJECT_COMPLETION.md`
- `docs/IMPLEMENTATION_SUMMARY.md`
- `docs/FEATURES_COMPARISON.md`
- `supabase/migrations/*.sql`
- `git log --date=short --pretty=format:'%ad %h %s' --reverse`
