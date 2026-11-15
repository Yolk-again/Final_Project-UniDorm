# UniDorm Round 5 — Admin Workspace and Student Stay Improvements

## Included changes

- Restored a dark, high-contrast administrator dashboard header so the heading and subtitle remain readable over the hero background.
- Persisted chat read markers using the newest fetched message timestamp (plus a small offset), preventing already-viewed group messages from reappearing as unread after a page refresh.
- Added published-announcement cards to the administrator Announcements view, including audience and publication time.
- Added male/female breakdowns to the administrator's available-room count and occupancy overview.
- Renamed the student `My Bookings` tab to `My Stay` and expanded the view into `My Stay & Booking History`.
- Added an active-accommodation summary and direct shortcuts to bills and admin chat after a booking is approved.

## Notes

- Existing backend routes, database schema, migrations, bill-validation changes, and chat APIs are retained.
- No database migration is required.
- Chat read state remains browser-local (localStorage), matching the existing implementation; it is not a cross-device read receipt.
- Run the frontend/backend checks locally before deployment.
