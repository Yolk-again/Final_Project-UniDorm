# UniDorm Round 11 — Role-targeted in-app notifications

## What changed

Added a database-backed notification center for both student and admin workspaces. Notifications are private to the authenticated account, can be marked individually or all at once, show the event date/time, and refresh automatically while the dashboard is open.

Events currently generating notifications:

- A new bill is created: only the student named on that bill is notified.
- A student submits payment proof: all admin accounts are notified that verification is needed.
- An admin approves/rejects payment proof: the bill's student is notified of the result.
- A student submits a room booking: admins are notified.
- An admin approves/rejects a booking: that student is notified.
- An admin publishes an announcement: students matching the announcement audience are notified.
- A new room is created: students matching the room gender are notified.
- A new direct/group chat message arrives: the appropriate recipient(s) are notified; a group-message sender is excluded from their own notification.

Read receipts are per user. Marking a notification as read only changes the notification belonging to the signed-in account. `Mark all as read` is also scoped to that account.

## API

- `GET /notifications` — latest 50 notifications and total unread count.
- `PATCH /notifications/:id/read` — mark one of the current user's notifications as read.
- `PATCH /notifications/read-all` — mark all of the current user's notifications as read.

All routes require authentication and are available to both student and admin roles. The server derives the recipient from the verified JWT; clients cannot request another account's notifications.

## Database

Added Prisma `NotificationType` enum and `Notification` model with a foreign key to `User`. New migration:

`20261115100000_add_in_app_notifications`

No existing business records are modified. Notification rows are deleted automatically when their owning user is deleted.

## Important operational note

Notification delivery is in-app only in this release. The dashboard polls every 30 seconds while open; this package does not claim to send email, SMS, browser push, or offline notifications. Notification writes are best-effort after the core business action succeeds, so a transient notification insert failure is logged without turning a successfully created bill/booking/message into a misleading API failure.
