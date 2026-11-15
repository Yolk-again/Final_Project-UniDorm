# UniDorm Round 7 Reapplied — Local Testing

Stop the backend and frontend development servers before extracting this update. Extract the ZIP directly into the existing `Final_Project-UniDorm` folder. Do not delete or overwrite your private `backend/.env`, `frontend/.env.local`, or `.git` folder.

## Apply the database migration

Open PowerShell in the project root and run:

```powershell
$root = "C:\Users\joetu\Projects\Final_Project-UniDorm"
Set-Location "$root\backend"
.\node_modules\.bin\prisma.cmd migrate deploy
.\node_modules\.bin\prisma.cmd generate
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand
```

## Check the frontend

```powershell
Set-Location "$root\frontend"
npm run lint
npm run build
```

## Start locally

Backend terminal:

```powershell
Set-Location "$root\backend"
npm run start:dev
```

Frontend terminal:

```powershell
Set-Location "$root\frontend"
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Open `http://localhost:3000`.

## Manual checks

1. Admin title bar: tabs should use the same dark translucent segmented track and white active pill as the student dashboard. At narrower widths, tabs remain in the title bar and scroll horizontally instead of squeezing the content.
2. Admin panels: dashboard content should occupy the full width; no legacy left-side navigation column should remain.
3. Announcements: creation form and published announcements should sit side by side on desktop and stack on smaller screens.
4. Admin chat: open a thread, refresh the page, and confirm its unread dot stays cleared. Send a new student message and confirm the dot returns until opened.
5. Student direct message: from Messages choose Message Admin, send a message, then confirm the thread appears in the admin Messages list.
6. Booking flow: before approval, Booking Status appears; after admin approval, the tab becomes My Stay. My Stay should show one current accommodation card and matching blue actions.

This package does not include `.env` files, `.git`, `node_modules`, `.next`, or `dist`.
