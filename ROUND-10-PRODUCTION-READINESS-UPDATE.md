# UniDorm — Production-readiness foundation (Round 10)

This update builds on the existing UniDorm UI, booking, chat, announcement, and manual-payment work. It is a foundation hardening pass, not a declaration that the deployment infrastructure is already production-ready.

## Manual payment workflow

- Students submit a payment reference, optional note, and JPG/PNG/PDF receipt up to 5 MB.
- The bill enters `SUBMITTED`; it is never marked `PAID` by a student request.
- Only an authenticated admin may approve or reject a submitted proof.
- Rejection requires a reason and permits a new submission. Every attempt has its own `PaymentSubmission` history row and proof file.
- Students can see their own submission history; students cannot view another student's bill or evidence.
- Proof files use generated server-side filenames, have their signatures checked, are served only through authenticated ownership-checked endpoints, and are not cacheable.

## Data integrity and safe writes

- Room, booking, and bill monetary fields use `DECIMAL(10,2)`.
- Partial unique indexes protect active bookings: at most one Pending/Approved booking per student and per room.
- A new integrity migration adds restrictive foreign keys from bookings and bills to their student and room records.
- Database checks reject non-positive room prices, booking prices, bill amounts, and proof sizes outside 1 byte–5 MB.
- A partial unique index prevents more than one receipt submission per bill from remaining in `SUBMITTED` at the same time.
- Migration preflight checks stop with a clear explanation if legacy bookings/bills point to missing students/rooms or money values violate the new constraints. No old booking or bill is silently deleted or rewritten.
- Booking status reviews only update `Pending` requests. Booking removal is transactional, checks the same status at deletion time, and never deletes an `Approved` booking through the ordinary delete endpoint.
- Rooms with booking or bill history cannot be deleted or renumbered.

## API validation and identity

- DTO validation rejects unknown fields and invalid values.
- Student identity for booking creation, chat messages, announcement authorship, and payment evidence is derived from the authenticated JWT, not trusted from request fields.
- Student/admin role guards protect privileged actions.
- Registration handles uniqueness races; password inputs are constrained to bcrypt's 72 UTF-8 byte limit on both registration and login.
- Standard security response headers and strict production CORS/secret/storage configuration checks remain enabled.

## Operational health

- `/health` is a liveness endpoint.
- `/health/ready` runs a lightweight query against PostgreSQL and reports `ready` only when the database is reachable.

## Still required before a real deployment

- HTTPS and secure domain/proxy configuration.
- Distributed authentication/API rate limiting at the ingress (an in-process limiter is not sufficient for multiple instances).
- Durable private payment-proof storage, encrypted database+file backups, and a tested restore procedure.
- Session revocation, account recovery, centralized monitoring/alerting, privacy notice and retention policy, and documented payment-review procedures.
- Real payment evidence must be compared by an authorized admin with the actual payment record before approval. The app does not independently verify a bank transfer.

## Apply the update

Follow `PRODUCTION-READINESS-POWERSHELL.md`. Back up PostgreSQL and the private payment-proof directory before applying both new migrations. Run `prisma migrate deploy`, then `prisma generate`, backend build/tests, and frontend lint/build. Never run `prisma migrate reset` against a database with user data.

## Follow-up migration repair

If your database previously returned P3018 on `20261115060000_enforce_core_data_integrity` because old bills point to deleted room records, use `FIX-ROUND10-MIGRATION.ps1` after extracting the repaired package. See `ROUND-10-MIGRATION-AND-BUILD-REPAIR.md`. The repaired migration preserves those historical bills and adds the room foreign key as `NOT VALID`, enforcing it for new/changed references without dropping legacy data.
