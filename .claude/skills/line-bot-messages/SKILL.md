---
name: line-bot-messages
description: This skill should be used when the user asks to find, change, edit, rewrite, or adjust the tone/wording of any message the LINE bot sends to students or the treasurer in this classroom-finance app — e.g. "change the message when...", "where can I edit the LINE bot text", "make the bot sound more natural/human", "adjust the wording sent to people", "add/change a notification".
---

# LINE Bot Messages

Locate and edit every user-facing message the LINE bot sends in this app, and keep the tone consistent when rewriting.

## Where every message lives

Three files contain 100% of outbound LINE text. Nothing else in the codebase sends LINE messages.

1. **`src/app/api/line/webhook/route.ts`** — all student-facing chat replies. Grep for `replyLineText(event.replyToken` to enumerate every discrete reply (registration, payment menu, amount/method selection, slip upload outcomes, cancel, status/history commands). Each call is either a plain string or a `[...].join("\n")` array of lines.
2. **`src/lib/server/linePaymentReview.ts`** — the two `pushLineText(...)` calls sent to a student after a treasurer approves or rejects a slip from the web app (`approveLinePaymentRequest` / `rejectLinePaymentRequest`).
3. **`src/lib/server/lineScheduleMessages.ts`** — `buildAnnouncementFlexMessage` and `buildReminderFlexMessage`, the Flex-card messages sent when a schedule is created or a reminder is triggered.

To find every message in one pass, run:
```
grep -n "replyLineText(event.replyToken\|pushLineText(" src/app/api/line/webhook/route.ts src/lib/server/linePaymentReview.ts
```

## What counts as "a message" vs. structural UI

Inside Flex-card builder functions (`createPayMenuBubble`, `createAmountSelectionBubble`, `createPaymentMethodBubble`, `createCashPaymentBubble`, `createQrPaymentBubble`, `createStudentStatusBubble`, `createStudentHistoryBubble`, `createClassroomTotalBubble`, and the two builders in `lineScheduleMessages.ts`):

- `flexText(...)` calls holding a full sentence (e.g. "โอนเสร็จแล้วส่งรูปสลิปกลับมาในแชทนี้ได้เลยครับ") are conversational messages — rewrite these for tone.
- `metricBox(label, value, ...)` calls holding a short label (e.g. "ยอดค้างรวม", "ครบกำหนด", "ยอดเงิน") are receipt-style UI labels, not spoken messages — leave these as terse labels, don't turn them into sentences.

## Voice guide (established tone — match this when rewriting)

- Warm, casual, first-person-adjacent Thai — like a person quickly typing a reply, not a templated system notice.
- Prefer flowing sentences over "field: value" bullet lines (e.g. write "ลองเช็กยอดเงินกับบัญชีปลายทางแล้วส่งสลิปใหม่มาอีกทีได้เลยครับ" instead of a labeled `เหตุผล: ...` line followed by a separate instruction line).
- Keep the existing sentence-ending particles (ครับ / น้า / นะ / นะครับ) and light emoji use — don't strip personality, but don't overload every line with an emoji either.
- Never drop or rephrase interpolated data: student names, numbers, amounts (`formatBaht(...)`), reject reasons, method names. Only the surrounding sentence changes.
- Collapse multi-line arrays into fewer, denser lines where the original was artificially choppy (e.g. a 4-line array can often become 2 natural sentences); don't preserve line breaks just because the original had them.

## Verification

There is no test suite for this route. After editing:
```
npx tsc --noEmit
npx eslint <changed files>
```
Both must pass clean. Actually seeing a message requires sending a real LINE event through the deployed bot (or the treasurer approving/rejecting a request in the web app for the `linePaymentReview.ts` messages) — this can't be simulated end-to-end from a coding session, so say so explicitly rather than claiming a message "looks right" without having seen it rendered.
