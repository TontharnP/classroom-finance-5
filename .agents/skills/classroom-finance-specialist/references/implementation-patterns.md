# Implementation Patterns

## UI

Use the existing app shell from `src/app/layout.tsx`: fixed viewport, `HydrationGate`, desktop sidebar, mobile nav, bottom tabs, and constrained `main`.

Use existing CSS tokens and classes from `src/app/globals.css`: `apple-card`, `apple-panel`, `apple-soft`, `apple-button`, `apple-ghost-button`, `apple-icon-button`, `apple-segmented`, `pressable`, `section-title`, `page-kicker`, and fixed-page layout helpers.

Use lucide-react icons for controls. Icon-only buttons need Thai `aria-label` text.

Keep UI copy Thai where surrounding UI is Thai. Preserve financial wording and student-facing tone.

Implement responsive behavior explicitly. Thai labels can be long; use `min-w-0`, `truncate`, wrapping, stable grid tracks, and mobile modal sizing.

## State And Data Flow

The app hydrates a `DataBundle` into Zustand from `src/lib/store.ts`.

UI-facing data types in `src/types/index.ts` use camelCase:

- `Student.firstName`, `lastName`, `nickName`, `avatarUrl`, `lineUserId`
- `Schedule.amountPerItem`, `startDate`, `endDate`, `studentIds`, `folderId`
- `Transaction.createdAt`, `scheduleId`, `studentId`, pocket fields

Supabase/API types in `src/types/supabase.ts` use snake_case:

- `first_name`, `last_name`, `nick_name`, `avatar_url`, `line_user_id`
- `amount_per_item`, `start_date`, `end_date`, `student_ids`, `folder_id`
- `created_at`, `schedule_id`, `student_id`, pocket fields

When adding or changing fields, update types, mappers, API routes, client wrappers, store updates, and UI forms together.

## API Routes

API routes use Next.js App Router handlers under `src/app/api/**/route.ts`.

Use response helpers from `src/lib/api/response.ts`:

- `ok(data, status?)`
- `noContent()`
- `badRequest(message)`
- `notFound(message?)`
- `serverError(error)`

Use `src/lib/supabase/server.ts` helpers for common Supabase operations:

- `listRecords`
- `getRecord`
- `createRecord`
- `updateRecord`
- `deleteRecord`
- `emptyToNull`
- `normalizeForSupabase`

Dynamic route handlers currently use `type RouteContext = { params: Promise<{ id: string }> }`; match that pattern.

For PATCH routes, whitelist update columns before calling `updateRecord`.

## Database And Migrations

Create new migrations in `supabase/migrations` with the next numeric prefix.

Prefer additive, production-safe SQL:

- `CREATE TABLE IF NOT EXISTS`
- `CREATE INDEX IF NOT EXISTS`
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
- backfill before stricter constraints
- avoid destructive changes unless explicitly requested

Key schema concepts:

- `students.number` is unique and positive.
- `schedules.student_ids` stores selected students.
- `transactions.source` distinguishes normal transactions from schedule payments.
- Schedule transactions should keep `schedule_id` and `student_id`.
- `line_payment_requests` tracks LINE payment state and proof review.
- `method` includes `kplus`, `cash`, and `truemoney`; some compatibility code mentions legacy `bank`.

## LINE And Payment Flows

The LINE webhook is `src/app/api/line/webhook/route.ts`.

Webhook POST must validate `x-line-signature` using `LINE_CHANNEL_SECRET` before processing.

LINE helpers in `src/lib/server/line.ts` call push, rich menu link, rich menu lookup, and unlink APIs using `LINE_CHANNEL_ACCESS_TOKEN`.

Student registration links `source.userId` to `students.line_user_id`.

Payment requests move through statuses:

- `selecting`
- `awaiting_slip`
- `pending_review`
- `cash_pending`
- `approved`
- `rejected`
- `expired`

Avoid changes that can approve a request twice, create duplicate schedule transactions, or link a LINE account to the wrong student.

## Uploads

Student avatars and payment proof images use Vercel Blob. Routes and storage helpers require `BLOB_READ_WRITE_TOKEN`.

Do not trust client-supplied filenames, MIME types, sizes, or paths without validation.
