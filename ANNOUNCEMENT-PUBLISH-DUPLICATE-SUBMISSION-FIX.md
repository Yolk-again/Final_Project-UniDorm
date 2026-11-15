# Announcement publish duplicate-submission fix

## What changed

- Added an immediate in-flight ref lock so rapid repeat clicks cannot send overlapping create requests.
- Added client-side validation for trimmed title and content. Empty form submissions are stopped locally and do not reach the API.
- Disabled the publish button while the request is running and changed its label to `Publishing…`.
- Parses API JSON defensively and supports direct, `data`, and `announcement` response shapes.
- Adds a success toast after a confirmed create, and updates the published list without adding a duplicate card.
- Shows a useful toast only for an actual failed create request.

## Why this addresses the reported behavior

The server-side `Announcement title is required` validation is correct. The reported pattern—one announcement appears in the list while a title-required error is also logged—can occur when a second empty submission is sent after the first request succeeds and resets the form. The ref lock blocks overlapping requests; the client-side validation also blocks any later submission against the now-empty form.

No backend changes or database migrations are required.
