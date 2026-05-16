---
name: accessibility-review
description: Review and improve accessibility in the Classroom Finance UI. Use for keyboard navigation, focus management, Thai accessible names, semantic HTML, modal dialogs, forms, charts, calendars, buttons, color contrast, reduced motion, and screen reader behavior in src/app and src/components.
---

# Accessibility Review

## Project Context

The app is a Thai-language finance dashboard with desktop sidebar navigation, mobile nav, bottom tabs, modal-heavy CRUD flows, charts, calendars, image uploads, and LINE/payment workflows.

The shared modal is `src/components/ui/Modal.tsx`. It sets `role="dialog"`, `aria-modal`, `aria-labelledby`, Escape close, and initial focus, but review each use for accessible content, focus return, and nested interactive controls.

## Workflow

Inspect the user flow as keyboard-only first: route navigation, tab order, modal open/close, form entry, validation, delete confirmation, and payment actions.

Prefer native HTML controls. Use ARIA only to fill gaps that native elements cannot express.

Ensure every icon-only button has a Thai `aria-label` and every form field has a visible label or an explicit accessible name.

Validate dynamic states: loading skeletons, empty states, toast feedback, validation errors, disabled submit buttons, selected segmented controls, and calendar/date selection.

Check mobile touch targets and Thai text wrapping so labels are readable and controls remain usable.

## Common Fixes

Add `aria-current="page"` to active navigation, `aria-describedby` for form help/errors, `aria-live` for async status messages when toast alone is insufficient, and visible focus styles using existing CSS variables.

Use text alternatives for uploaded avatars, QR codes, proof images, and decorative illustrations. Mark decorative assets with empty alt text when appropriate.

Respect reduced motion for Framer Motion-heavy changes where large animation is introduced.

## Verification

Run `npm run lint` after edits. When possible, smoke test keyboard operation in the browser across desktop and mobile widths.
