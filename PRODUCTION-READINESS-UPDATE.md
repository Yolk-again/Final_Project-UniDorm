# Production readiness — first implementation stage

This stage establishes stronger request validation, booking/data integrity, and the manual payment verification workflow while retaining the current UniDorm screens and existing features.

## Server-side protections

- DTO validation with whitelist and forbid-non-whitelisted enabled for authentication, room, booking, chat, announcement, and payment endpoints.
- Server-derived user identity for booking creation, chat senders, and announcement authors.
- Admin-only bill issuance and payment verification; student-only proof submissions; ownership checks before bill/proof access.
- File type allow-list plus signature verification; 5 MB limit; generated storage names; private proof directory; no-store proof responses.
- Conditional transactional bill state changes and a separate append-only history row for each receipt submission.
- Database partial unique indexes prevent concurrent active booking conflicts.
- Decimal database money fields.
- Room historical references are protected against renumber/delete operations.
- Production config validation for secrets, HTTPS origins, and persistent private proof storage.

## Manual payment operating procedure

1. Student pays through the dormitory's offline/manual process.
2. Student submits payment reference and receipt file in UniDorm.
3. Bill becomes `SUBMITTED`; it is not counted as paid.
4. Authorized admin checks the proof against the actual cash/bank/transfer record outside UniDorm.
5. Admin approves (`PAID`) or rejects with a reason (`REJECTED`).
6. Student may resubmit corrected proof after rejection. Old submission files and decisions remain available in history.

## Known production prerequisites not supplied by source code

- Put API and frontend behind HTTPS.
- Configure distributed rate limiting at the trusted reverse proxy/ingress; in-process development server limits are not enough for multi-instance deployments.
- Configure `PAYMENT_PROOF_DIR` as durable private storage outside `public` and back it up together with PostgreSQL.
- Add operational backups and demonstrate restoration.
- Configure centralized monitoring, alerts, privacy notice/retention rules, session revocation/password recovery, and admin staff procedures.
- Do not treat manual proof upload as an online payment integration or bank confirmation.
