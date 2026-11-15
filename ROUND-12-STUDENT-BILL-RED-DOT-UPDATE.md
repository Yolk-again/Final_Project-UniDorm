# Round 12 — Student New Bill Red-Dot Indicator

## Behaviour

- The payment service already creates a `BILL_CREATED` notification for the specific student when an administrator creates a bill.
- The student dashboard now queries a dedicated unread count for `BILL_CREATED` notifications.
- A small red dot appears beside the **Payments** tab while that student has one or more unread bill-created notifications.
- Opening Payments (including opening it from the notification bell or My Stay's View my bills shortcut) marks only that student's `BILL_CREATED` notifications as read.
- The dot clears only after the backend confirms the update. Failed requests leave the dot visible.
- The state is stored in PostgreSQL through the existing Notification records, so it remains cleared after a refresh. New bills create fresh unread notifications and restore the dot.
- The notification bell refreshes its unread count immediately after the Payments tab clears bill notifications.

## API additions

- `GET /notifications/unread-count/:type` — returns the unread count of one notification type for the authenticated user.
- `PATCH /notifications/type/:type/read` — marks only the authenticated user's unread notifications of that type as read.
- Unknown notification types are rejected. User scoping is enforced in the database query.

## Database

No Prisma schema change or database migration is required. This uses the Round 11 `Notification` model and the existing `BILL_CREATED` enum value.
