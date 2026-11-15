# Chat read receipt and admin navigation fix

## Chat notification persistence

- Removed the browser-local `chatReadTimes_admin` fallback. The admin unread indicator now uses the persisted `ChatThread.adminLastReadAt` timestamp returned by the API.
- Opening a thread loads its messages and requires the `PATCH /chat/threads/:chatKey/read` request to succeed before the UI updates that thread’s read receipt. Failed read receipt requests now produce a visible error toast instead of silently hiding the notification in local state.
- The backend reads the newest message timestamp before saving the receipt and stores a timestamp at least one millisecond later. This avoids the clock/precision edge case where a message could remain unread after the admin opened it and the page was refreshed. Messages arriving after the receipt are still considered unread.

## Admin tab appearance

- Overrode the legacy desktop admin sidebar rule that set `.dashboard-nav` to a vertical column.
- Admin title-bar tabs now use the student dashboard segmented-control geometry and colors: same track padding, border, radius, gap, tab height, inactive text color, hover state, and white active tab.
- Tabs stay in one horizontal row and scroll horizontally when the available width is too small.

## Database

No schema change or new Prisma migration is required. The existing `adminLastReadAt` field and migration from the supplied project are retained.
