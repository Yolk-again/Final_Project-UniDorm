# UniDorm Round 7 Update

## Admin management navigation
- Admin management controls now use the same segmented, pill-style tab strip as the student dashboard: soft slate track, white active tab, blue active text, rounded compact tabs, and matching hover states.
- Labels are simplified to Room Management, Booking Requests, Announcements, Payments, and Chat.
- The notification dot remains anchored to the Chat tab.

## Student-to-admin direct messaging
- Students can start a private direct conversation from the Messages tab or the Contact admin action in My Stay.
- The backend accepts student-initiated DIRECT threads, routes them to the earliest-created admin account, and marks those student-started conversations accepted so students can message immediately.
- Student-started conversations are isolated from admin-started pending chat requests.
- The conversation appears in the admin Chat thread list and remains available to both accounts.

## Booking status to My Stay transition
- While the student has booking records but no approved room, the navigation shows Booking Status instead of My Stay.
- Pending and rejected request details are displayed in Booking Status. Rejected requests can be removed.
- Once a request becomes Approved, Booking Status disappears and My Stay appears automatically.
- My Stay is simplified to one current accommodation card, avoiding duplicate room/booking rows.

## My Stay actions
- View my bills and Contact admin now use the same blue button treatment.
- Contact admin opens or creates the student's direct admin conversation.

## Database
- No schema change or migration is needed. The existing ChatThread model supports DIRECT conversations and already stores studentId, adminId and status.
- The previous admin read-receipt migration is preserved.
