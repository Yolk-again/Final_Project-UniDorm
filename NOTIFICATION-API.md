# UniDorm notification API

All routes use the existing bearer-token authentication and role guards.

## List notifications

`GET /notifications`

Response shape:

```json
{
  "items": [
    {
      "id": 1,
      "type": "BILL_CREATED",
      "title": "A new bill is available",
      "message": "Semester room fee · 5500.00 THB · due 11/30/2026.",
      "link": "student:payments",
      "entityId": 24,
      "readAt": null,
      "createdAt": "2026-11-15T10:00:00.000Z"
    }
  ],
  "unreadCount": 1
}
```

Only records owned by the authenticated user are returned.

## Mark one read

`PATCH /notifications/:id/read`

Returns the updated notification. A record owned by another account is returned as not found.

## Mark all read

`PATCH /notifications/read-all`

Returns `{ "updatedCount": number }` and only updates unread rows belonging to the authenticated account.


## Get unread count for one notification type

`GET /notifications/unread-count/:type`

Returns `{ "type": "BILL_CREATED", "unreadCount": number }`. Only unread records owned by the authenticated account are counted. Unknown notification types are rejected.

## Mark one notification type read

`PATCH /notifications/type/:type/read`

Returns `{ "type": "BILL_CREATED", "updatedCount": number }`. Only unread records of the selected type belonging to the authenticated account are updated. This lets the student's Payments tab clear bill-created notifications without clearing unrelated chat or announcement notifications.
