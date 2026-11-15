# UniDorm — Student Announcement Read Function

The student announcement notification now uses server-side, per-account read receipts instead of localStorage.

## Apply

1. Stop the frontend and backend development servers.
2. Extract this project ZIP over `C:\Users\joetu\Projects\Final_Project-UniDorm`.
3. Preserve your existing `.git`, `backend\.env`, and `frontend\.env.local` files.
4. Run the migration, regenerate Prisma Client, then build and test as shown in `ROUND-9-POWERSHELL-TESTING.md`.

Do not reset the database. The migration adds a receipt table with cascading foreign keys and a unique receipt per announcement/student pair.
