# UniDorm Round 8 Update

## Date and time visibility
- Added consistent local date/time formatting for room listings, booking submissions and updates, announcements, bill creation/payment/due timestamps, chat activity, chat messages, and workspace sync labels.
- Changed the admin bill due field to a date-and-time picker (`datetime-local`) so the due timestamp is intentional rather than silently defaulting to midnight.

## Chat read receipts
- Added per-user, per-chat read receipt records, including a backfill from the previous admin-only read marker. Group chats now track the read state independently for each student and the admin.
- Enabled the authenticated read endpoint for both student and admin roles.
- Removed browser-local chat read timestamps as the source of truth.
- Opening any group or direct chat saves its read receipt through the backend.
- Read receipts also store the last-read message ID, so later messages can be detected reliably without depending only on client/server clock precision.
- No success popup is displayed when a chat is marked as read.

## Direct messages
- Direct conversations are immediately open for both sides.
- Older pending/denied direct threads are normalized to accepted when chat threads are fetched.
- Removed request acceptance/denial controls and status labels from both dashboards.
- Student-initiated and admin-initiated conversations reuse the existing direct thread for that student where possible.

## Booking summary
- Once a booking is approved, the booking-progress view is replaced by My Stay.
- The summary card switches from Booking Status to My Stay and no longer says that the student has one active booking.

## Database
- Added migration `20261115023000_add_per_user_chat_read_receipts`.
- No reset is required. Run `prisma migrate deploy` followed by `prisma generate` before building the backend.
