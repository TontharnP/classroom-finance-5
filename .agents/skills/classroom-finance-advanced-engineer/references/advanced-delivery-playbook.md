# Advanced Delivery Playbook

## When To Use This Playbook

Use this for changes that touch more than one of these layers:

- UI page/component/modal/form
- Zustand state or hydration
- API route
- Supabase table, migration, mapper, or type
- LINE webhook or rich menu behavior
- Vercel Blob upload/storage
- deployment or environment configuration

## Planning Sequence

Define the user workflow first. Name the actor: treasurer/admin, student using LINE, or developer/operator.

Trace the data path:

1. UI input or webhook event.
2. Client wrapper or external API request.
3. App Router route.
4. Validation and authorization assumptions.
5. Supabase reads/writes.
6. Mapper and response shape.
7. Zustand update or external LINE response.
8. User-facing feedback.

Write down compatibility points:

- Existing records without the new field.
- Old migration states.
- Missing environment variables.
- Students without `line_user_id`.
- Schedules without complete folder metadata.
- Legacy transaction method values such as `bank`.

## Implementation Order

For new data-backed features:

1. Add migration first, preferably additive.
2. Update `src/types/supabase.ts`.
3. Update `src/lib/supabase/mappers.ts`.
4. Update API routes and allowed update columns.
5. Update client wrappers in `src/lib/supabase`.
6. Update UI types in `src/types/index.ts` only if UI shape changes.
7. Update Zustand store if new entity state is stored globally.
8. Update pages/components/modals.
9. Update docs for setup or workflow changes.
10. Verify with lint/build and a manual smoke path.

For UI-only features:

1. Inspect nearby components and `globals.css`.
2. Preserve shell, responsive layout, Thai copy style, dark mode, and modal conventions.
3. Implement loading, empty, disabled, error, mobile, and keyboard states when relevant.
4. Avoid schema/API work unless the UI needs persisted data.

For LINE/payment features:

1. Inspect `src/app/api/line/webhook/route.ts`.
2. Preserve signature verification before parsing events.
3. Confirm request status transitions.
4. Confirm duplicate handling and idempotency.
5. Confirm student identity binding.
6. Confirm payment proof storage and transaction creation.
7. Verify both success and rejection/cancel paths.

## Cross-Layer Review Questions

- Does the API return the same shape the UI expects?
- Does the mapper handle nulls and legacy rows?
- Does the UI update state from the server result rather than from guessed local data?
- Can a double click, retry, webhook replay, or refresh duplicate a payment?
- Does a migration preserve existing data?
- Does a missing env var fail with a clear message?
- Does the change still work on mobile?
- Does Thai text fit in buttons, cards, modal headers, and nav labels?
