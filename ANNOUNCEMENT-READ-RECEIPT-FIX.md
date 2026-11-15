# Student Announcement Read Receipts

Student announcement read status is now stored in PostgreSQL per student account instead of browser localStorage.

- `GET /announcements` returns `isRead` and `readAt` for each announcement visible to the authenticated student.
- `PATCH /announcements/:id/read` stores the student's read receipt.
- Opening the Announcements tab marks visible unread announcements as read.
- The announcement navigation dot is driven by the server-provided `isRead` state and remains cleared after refresh.
- Read receipts are private to each student and do not affect other students.

Apply the new migration with `prisma migrate deploy`, then regenerate Prisma Client before building the backend. Do not reset the database.
