---
name: slip-verification
description: This skill should be used when the user asks to describe, review, audit, explain, or modify the payment-slip verification/checking pipeline in this classroom-finance app — e.g. "describe the slip checking method", "review the slip verification for security/efficiency issues", "why did a slip get approved/rejected/flagged as duplicate", "change the auto-approval or auto-reject logic".
---

# Slip Verification Pipeline

Understand and safely modify how the LINE bot verifies student payment slips.

## Architecture (read these in order for a full picture)

1. **Entry point**: `src/app/api/line/webhook/route.ts` → `handleSlipImage` (triggered when a student sends an image while their request is `awaiting_slip`). This function owns all the decision logic (duplicate detection, auto-reject, status assignment) — it is the one place to look for "why did this slip get X status".
2. **Core analysis**: `src/lib/server/slipCheck.ts` → `analyzeSlipImage`. Does SHA-256 image hashing, QR decode (`sharp` + `jsQR`, including band-slicing for tall "long slip" screenshots), calls EasySlip, falls back to local OCR (`tesseract.js`) if EasySlip fails or is unconfigured, and extracts/matches amount, receiver account, receiver name, and transaction ID.
3. **External verifier**: `src/lib/server/easySlip.ts` — EasySlip API v2 client (`/verify/bank` for payload or image mode, `/verify/truewallet` for TrueMoney). Auth via `EASYSLIP_API_KEY` Bearer token; gracefully returns `provider: "none"` if unconfigured.
4. **Approval/rejection side effects**: `src/lib/server/linePaymentReview.ts` — `approveLinePaymentRequest` (creates the `transactions` row, archives slip metadata, enforces per-user slip-image retention, deletes the request) and `rejectLinePaymentRequest` (pushes rejection reason, deletes slip image and request). Both are used by manual web-review endpoints; `approveLinePaymentRequest` is also called by treasurers via `PATCH/POST /api/line/payment-requests/[id]`.

## Current design decision: no automatic approval

As of the last review, **automatic approval was intentionally removed**. The reasoning: a locally-decoded QR payload or OCR text is not cryptographic proof of a real bank transfer — nothing ties it to an actual transaction unless EasySlip itself confirms it, and the old `canAutoApprove` condition was `(easySlipVerified || qrReadable)` — an OR that let a spoofable local QR/OCR match auto-approve money movement even when EasySlip explicitly failed to verify the slip. Every slip that isn't a duplicate or a clearly invalid/mismatched image now lands in `pending_slip_review` for a human treasurer to approve via the web app. Do not reintroduce automatic approval without re-litigating this tradeoff with the user explicitly — this is a deliberate security decision, not an oversight.

What **is** still automatic (preserve these when making changes):
- **Duplicate detection**: same QR payload, image hash, or transaction ID as an existing pending request or an archived approved slip, or EasySlip's own `isDuplicate` flag → `duplicate_suspected`, kept (not deleted) for manual review.
- **Invalid/fake-slip auto-rejection**: `shouldAutoRejectInvalidImage` in `handleSlipImage` — fires when there's no QR, no EasySlip verification, no transaction ID, and no positive amount/account/name match at all (essentially zero usable evidence). Controlled by `SLIP_AUTO_REJECT_INVALID_IMAGE` (default on).
- **Mismatch auto-rejection** (optional): confirmed amount mismatch always contributes; receiver account/name mismatch also auto-rejects except for TrueMoney, which is lenient by default (`TRUEMONEY_AUTO_REJECT_RECEIVER_MISMATCH`, default `false`) because TrueMoney receipt OCR is less reliable.

## Known past issues (don't rediscover these)

- **tesseract.js + Turbopack bundling bug**: `tesseract.js`'s `spawnWorker.js` does `new Worker(workerPath)` — a real `worker_threads.Worker` pointed at a file path. Next.js was bundling this into the server chunk instead of leaving it as a plain `require()`, breaking the worker's internal file loading with `TypeError: The "path" argument must be of type string. Received type number`. Fixed by adding `serverExternalPackages: ["tesseract.js", "tesseract.js-core"]` to `next.config.ts` (`sharp` is already on Next's built-in external-packages list, which is why QR decoding was unaffected). This error is caught and logged in `slipCheck.ts`'s `readOcrText`, so it degrades gracefully rather than blocking the pipeline — but it silently disables the local OCR fallback until fixed.
- No admin/treasurer LINE or push notification exists yet when a slip arrives — the treasurer only sees pending slips by opening the web app's Notifications list (`NotificationList.tsx`, SWR-fetched, no polling interval). If asked to add one, this is a fresh feature, not something to assume already exists.

## Efficiency note

`listRecords()` (`src/lib/supabase/server.ts`) does an unfiltered `select("*")` — `handleSlipImage` calls it against the *entire* `line_payment_requests` and `line_payment_slip_archives` tables on every single slip check, even though migration `011_add_line_payment_slip_archives.sql` already added indexes on `slip_qr_payload`/`slip_image_hash`/`slip_transaction_id` specifically for this lookup. If asked to optimize, push the duplicate-lookup filtering into indexed Supabase queries (`.eq()`/`.or()`) instead of fetching everything into JS.

## Verification

No test suite exists for this pipeline. Verify changes with `npx tsc --noEmit` and `npm run build`, then manually trace the relevant scenario through `handleSlipImage`'s conditionals (clean slip / duplicate / invalid image / mismatch) rather than assuming — this logic has several interacting boolean flags (`duplicateSuspected`, `shouldAutoRejectSlip`, `slipStatus`) and small edits can have non-obvious interactions. End-to-end testing requires a real LINE webhook event and Content API round-trip, which can't be simulated from a coding session — say so explicitly if asked to confirm live behavior.
