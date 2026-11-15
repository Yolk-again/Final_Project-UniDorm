# UniDorm Round 6 Update

- Moved admin management tabs into the admin title bar, matching the student workspace navigation pattern.
- Placed the announcement composer and published announcement list side by side on wide screens, stacking on smaller screens.
- Added a server-persisted admin chat read receipt (`ChatThread.adminLastReadAt`) so read state survives browser refreshes and is shared across admin sessions.
- The Messages tab dot now reflects unread messages rather than remaining permanently active for any pending direct-chat request.

## Database update
A Prisma migration was added: `20261115001500_add_admin_chat_read_receipt`. Run `npx prisma migrate deploy` in the backend before starting the API. No existing rows are deleted.
