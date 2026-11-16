# UniDorm free student-demo operating limits

Last reviewed: 16 November 2026

## Intended use

Use the free deployment for development, demonstrations, and synthetic test accounts. Do not invite real residents to register and do not use it as the system of record for real tenancy, student identity, room allocation, or money received.

## Observed Render configuration

- API service: `unidorm-api-demo`, free plan, Singapore region.
- PostgreSQL: `unidorm-demo-db`, free plan, PostgreSQL 18.
- The connected Render account reports the free database expiration as 15 December 2026.
- The API currently points payment proof storage at `/tmp/unidorm-payment-proofs`, which is temporary instance storage.
- The API uses a single free web-service instance and may spin down while idle.

The database expiry is account-specific deployment metadata, not a permanent guarantee. Check the Render dashboard and export the data before the displayed expiry.

## Safety controls in this release

- Payment receipt uploads are disabled in production unless `PAYMENT_PROOF_STORAGE_DURABLE=true` is configured.
- The readiness endpoint reports whether payment submissions are enabled and whether durable private storage is configured.
- Production startup rejects a claimed durable proof directory located under `/tmp` or `/var/tmp`.
- Login and registration have process-local IP request limits (120 login requests per 15 minutes and 60 registrations per hour per client IP).
- Each protected API request checks that the account still exists and that the role and student/admin identity in the token still match the database.

## Before using real student information

1. Select a database provider and plan with an explicit retention policy, backups, export capability, and a tested restore procedure. A free database may be suitable for a controlled pilot only if its expiry and backup limits are acceptable.
2. Export the existing database before the current Render free database expires. Verify the export by restoring it to a separate test database. Do not run `prisma migrate reset` against the live database.
3. Configure private durable object storage or a persistent volume for receipt files. Store storage credentials only as backend environment secrets. Never put receipts in `frontend/public`, Git, or temporary container storage.
4. Back up the database and receipt objects together. Test restoring both so receipt metadata does not point to missing files.
5. Add student identity verification through an approved PSU process. The 10-digit format and suspicious-pattern checks only detect possible typing errors; they do not prove enrollment.
6. Add an account recovery/email-verification process, privacy notice, data-retention and deletion rules, incident response contact, and named authorized payment reviewers.
7. Configure distributed rate limiting at the edge, monitoring, and a supported production deployment plan.

## Payment status warning

UniDorm's manual payment workflow records receipt submission and administrator review. It does not receive money, verify bank transfers automatically, or provide a payment gateway. An administrator must compare a receipt with the actual transaction before approving a bill.

## Free-tier policy

No paid service, upgrade, or billing change is performed by this repository. Keep the demo on free resources only while accepting the limitations above. If durable storage is not available within the free allowance, leave that feature disabled rather than silently storing critical records in ephemeral storage.
