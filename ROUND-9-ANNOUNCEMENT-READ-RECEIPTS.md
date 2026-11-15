# Round 9 — Student Announcement Read Receipts

Student announcement read state is persisted per authenticated student in PostgreSQL. It is no longer stored in browser localStorage.

## Behavior

- `GET /announcements` returns visible student announcements with `isRead` and `readAt`.
- Opening the student Announcements tab automatically marks each visible unread announcement as read through `PATCH /announcements/:id/read`.
- The student navigation indicator is derived from the server response, so it remains cleared after a refresh.
- Receipts are account-specific: one student reading an announcement does not mark it as read for other students.
- Admin announcement listing/creation behavior remains unchanged.
- Only authenticated student accounts can create read receipts; gender-specific announcements cannot be marked by students outside the audience.

## Database

Adds `AnnouncementReadReceipt` with a unique `(announcementId, userId)` key and cascading foreign keys to Announcement and User. Apply the new migration using `prisma migrate deploy`, then run `prisma generate`. Do not reset the database.
