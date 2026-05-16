# Financial Integrity

## Core Invariants

Transactions are the source of truth for money movement. Preserve `kind`, `source`, `amount`, `method`, schedule links, student links, category links, and pocket fields.

Schedule-linked payments must have:

- `source = "schedule"`
- `schedule_id`
- `student_id`
- positive `amount`
- method when payment method is known

Normal transactions must not accidentally gain schedule/student links.

Transfers must preserve source and destination pocket semantics and should not be counted as income or expense unless existing business logic explicitly does so.

LINE payment approval must not create duplicate transactions for the same request.

Student LINE binding must stay one LINE user to one intended student unless an admin deliberately clears or changes the binding.

## Schedule Payment Risks

Check for duplicate payment creation when:

- a user double-clicks Quick Pay
- LINE webhook events retry
- a payment proof is submitted twice
- an admin approves a pending request twice
- a schedule detail modal refreshes during mutation

Use existing request status and transaction linkage to make approval idempotent.

## Amount And Method Rules

Amounts should be positive numbers. Avoid silently converting invalid input into zero.

Payment methods are `kplus`, `cash`, and `truemoney`; some types preserve legacy `bank` compatibility. Do not remove compatibility unless a migration and code audit prove it is safe.

PromptPay and TrueMoney QR behavior in the webhook must remain exact. Do not change hard-coded payment payload logic unless the user requested payment-provider changes.

## Data Shape Rules

UI shape is camelCase in `src/types/index.ts`.

Database/API shape is snake_case in `src/types/supabase.ts`.

Every schema change usually needs updates in:

- migration SQL
- Supabase type
- mapper
- API route allowed columns
- client wrapper
- UI form/state
- docs if setup or workflow changed

## Privacy And Safety

Student avatars, payment proof URLs, LINE User IDs, and payment request metadata are sensitive. Do not log more than needed.

Never print secret env values.

For LINE messages, avoid sending payment details to an unverified or wrong `line_user_id`.

For proof images, avoid trusting client-provided paths or exposing write tokens.
