# Round 10 payment-status TypeScript build fix

The payment resubmission check now uses an explicitly typed `PaymentStatus[]`. This allows `SUBMITTED` to be represented in the Prisma enum without TypeScript narrowing the `includes()` argument to only `PENDING | REJECTED`.

Allowed resubmission states remain `PENDING` and `REJECTED` only. `SUBMITTED` is deliberately not resubmittable while a receipt is awaiting review, and `PAID` remains final.
