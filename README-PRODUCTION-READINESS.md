# UniDorm production-readiness foundation update

## Included changes

- Manual payment workflow: students submit a payment reference and a receipt/slip; the bill moves to `SUBMITTED`, not `PAID`.
- Only an authenticated admin can approve or reject a submitted payment. Rejections require a reason and allow corrected proof to be submitted again.
- Every submission is retained in a `PaymentSubmission` history row with its own proof file, reference, submit time, review time, reviewer, result, and rejection reason. A later resubmission does not overwrite the former receipt.
- Both students and admins can inspect receipt history through authenticated, ownership-checked proof routes. Proof responses use `Cache-Control: private, no-store`.
- Only JPG, PNG, and PDF evidence is accepted, up to 5 MB. The server checks file signatures, not only browser MIME metadata.
- Payment amounts and room/booking prices use PostgreSQL `DECIMAL(10,2)` instead of floating-point storage.
- Active bookings are protected at the database level by partial unique indexes: one Pending/Approved booking per student and one per room. Migration preflight checks stop rather than silently remove existing duplicates.
- Booking and bill student/room references now have database foreign keys with restrictive deletes, so accounts and rooms cannot be removed while operational/financial records depend on them. A preflight check stops migration if historical rows reference missing students or rooms.
- Database check constraints reject non-positive room prices, booking prices, and bill amounts; a partial unique index prevents two concurrently submitted receipts awaiting review on the same bill.
- Booking removal is now transactional and conditionally deletes only the same Pending/Rejected state observed at the start; approved booking history cannot be deleted through the ordinary delete route.
- Booking review only accepts requests still in Pending status. A student/room cannot obtain a second active booking through concurrent requests.
- Rooms with booking or bill history cannot be deleted; room numbers cannot be changed once referenced by a booking or bill. This preserves invoice and booking references.
- Typed request DTOs validate authentication, rooms, bookings, announcements, chat thread creation/messages, bill creation, payment submission, and payment review. Unknown request properties are rejected.
- Identity fields such as student ID, sender role, admin ID, and announcement author are derived from the authenticated account rather than trusted from the browser.
- Registration handles unique-key races as a conflict response; bcrypt password inputs are constrained to its 72 UTF-8 byte limit.
- Production startup requires strong JWT/admin-registration secrets, PostgreSQL, exact HTTPS frontend origins, and an explicit private payment-evidence storage configuration.
- Standard security response headers are enabled; payment evidence cannot be cached by browsers or shared proxies.
- `/health/ready` checks a live database query and reports payment-evidence storage capability separately.

## Manual payment lifecycle

`PENDING` -> student submits reference and proof -> `SUBMITTED` -> admin verifies against the actual payment record -> `PAID`.

If proof is insufficient: `SUBMITTED` -> admin rejects with a reason -> `REJECTED` -> student submits corrected proof -> `SUBMITTED`.

There is intentionally no student API route that can set a bill to `PAID`. The application records admin verification; it does not connect to a bank or independently confirm that money was transferred.

## Payment proof storage

By default files are stored under `backend/uploads/payment-proofs`. This folder is ignored by Git. For a deployed system, set `PAYMENT_PROOF_DIR` to an absolute, durable, access-controlled persistent volume outside the frontend/public web root. Set `PAYMENT_PROOF_STORAGE_DURABLE=true` only after verifying that the selected storage survives deploys, restarts, and instance replacement. Include this folder in encrypted backups together with PostgreSQL. Do not use ephemeral container storage for production evidence. The API serves proof only through authenticated routes and checks student ownership for student accounts.

When `PAYMENT_PROOF_STORAGE_DURABLE` is not explicitly true in production, the API disables new receipt submissions before Multer writes an uploaded file. The health readiness response reports `paymentSubmissionEnabled: false` and `paymentProofStorage: "not-configured"`.

## Authentication abuse controls

- Login: maximum 10 requests per client IP per 15 minutes.
- Registration: maximum 5 requests per client IP per hour.
- The current implementation stores counters in process memory. It is a free-demo safeguard for the current single instance, not distributed rate limiting. Counters reset on restart; deploy a distributed ingress/WAF limit before multi-instance or production operation.
- Protected requests re-read the account's current role and student/admin identifier from PostgreSQL. Deleted accounts and stale role/identity tokens are rejected. Gender is refreshed from the database for each request.

## Free student-demo limitations

The current Render free PostgreSQL instance is scheduled to expire on **15 December 2026** according to the connected account metadata. The demo also uses temporary filesystem storage for payment evidence. Keep only synthetic data in the demo and export the database before the displayed expiry date. See `FREE-STUDENT-DEMO-LIMITATIONS.md`.

## Required production configuration

- `NODE_ENV=production`
- `JWT_SECRET` with at least 32 unpredictable characters (prefer a long random secret)
- `ADMIN_REGISTRATION_KEY` with at least 32 unpredictable characters
- `DATABASE_URL` pointing to a retained PostgreSQL database with appropriate TLS/network policy, backups, and tested restore
- `FRONTEND_URL` containing exact HTTPS frontend origin(s), comma-separated
- `PAYMENT_PROOF_DIR` pointing to an absolute, private, writable durable storage directory outside any public web folder
- `PAYMENT_PROOF_STORAGE_DURABLE=true` only after the durable directory is verified
- HTTPS termination and distributed ingress/API rate limiting
- automated encrypted backups of PostgreSQL and payment-proof files, plus a tested restore procedure
- centralized logs/monitoring, alerting, privacy notice, proof-retention policy, identity verification, and operational reviewer procedures

## Deployment warning

This update strengthens application data integrity and adds safer free-demo defaults. It does not by itself complete production infrastructure. Before accepting real residents or money, configure retained database storage, durable private proof storage, distributed rate limiting, backups/restore drills, monitoring, account recovery, verified student onboarding, and an explicit privacy/retention policy. The manual receipt needs to be checked by an authorized administrator against the actual payment record before approval.
