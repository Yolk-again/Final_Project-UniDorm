# UniDorm Chat Layout Fix

This update includes the previous bill-creation validation fix and repairs the admin chat workspace layout.

## Chat changes
- The chat workspace now explicitly spans the full dashboard grid instead of being auto-placed into the sidebar column.
- The chat management area and selected conversation panel use full-width, min-width-safe layouts.
- Message bubbles wrap long IDs and unbroken message text instead of creating horizontal overflow.
- The conversation list scrolls vertically without horizontal scrolling.
- The message composer keeps its input flexible and the Send button visible on narrow screens; Enter submits the message.

## Apply
Extract this ZIP over the existing project root, preserving `.git`, `backend/.env`, and `frontend/.env.local`. Restart the backend and frontend development servers.
