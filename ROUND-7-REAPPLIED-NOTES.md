# UniDorm Round 7 — Reapplied to the newly supplied base

- Admin management navigation is inside the admin title bar and uses the same dark translucent segmented tab strip, white active pill, compact rounded tabs, and hover treatment as the student dashboard.
- Removed the obsolete desktop two-column sidebar grid rules that were squeezing the admin content area after the navigation moved into the title bar. Admin dashboard panels now use the full available width.
- Admin announcement creator and published announcement list are displayed side-by-side on desktop and stack cleanly on smaller screens.
- Admin chat read receipts are persisted in PostgreSQL using `ChatThread.adminLastReadAt`, so a read thread stays read after refresh. This update includes a Prisma migration for that field.
- Students can start a private direct message to the admin from the Chat area or the My Stay Contact admin action.
- Students see Booking Status while a booking is pending/rejected and My Stay once a booking is approved. My Stay shows one current accommodation card without the duplicate booking-history row.
- My Stay actions use matching blue button styles.

## Database update
Run `prisma migrate deploy` once after extracting, then rebuild the Prisma client.
