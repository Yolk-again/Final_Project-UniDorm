ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'SUBMITTED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

ALTER TABLE "Room"
  ALTER COLUMN "price" TYPE DECIMAL(10, 2)
  USING ROUND("price"::numeric, 2);

ALTER TABLE "Booking"
  ALTER COLUMN "price" TYPE DECIMAL(10, 2)
  USING ROUND("price"::numeric, 2);

ALTER TABLE "PaymentBill"
  ALTER COLUMN "amount" TYPE DECIMAL(10, 2)
  USING ROUND("amount"::numeric, 2);

ALTER TABLE "PaymentBill"
  ADD COLUMN "paymentReference" TEXT,
  ADD COLUMN "paymentNote" TEXT,
  ADD COLUMN "proofOriginalName" TEXT,
  ADD COLUMN "proofStorageName" TEXT,
  ADD COLUMN "proofMimeType" TEXT,
  ADD COLUMN "proofSize" INTEGER,
  ADD COLUMN "submittedAt" TIMESTAMP(3),
  ADD COLUMN "verifiedAt" TIMESTAMP(3),
  ADD COLUMN "verifiedById" INTEGER,
  ADD COLUMN "rejectionReason" TEXT;

ALTER TABLE "PaymentBill"
  ADD CONSTRAINT "PaymentBill_verifiedById_fkey"
  FOREIGN KEY ("verifiedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "PaymentBill_status_submittedAt_idx"
  ON "PaymentBill"("status", "submittedAt");

CREATE INDEX "PaymentBill_verifiedById_verifiedAt_idx"
  ON "PaymentBill"("verifiedById", "verifiedAt");

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "Booking"
    WHERE "status" IN ('Pending', 'Approved')
    GROUP BY "studentId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce active booking uniqueness: at least one student has multiple Pending/Approved bookings. Resolve duplicate active bookings and retry the migration.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "Booking"
    WHERE "status" IN ('Pending', 'Approved')
    GROUP BY "roomNumber"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce active booking uniqueness: at least one room has multiple Pending/Approved bookings. Resolve duplicate active bookings and retry the migration.';
  END IF;
END $$;

CREATE UNIQUE INDEX "Booking_one_active_per_student_idx"
  ON "Booking"("studentId")
  WHERE "status" IN ('Pending', 'Approved');

CREATE UNIQUE INDEX "Booking_one_active_per_room_idx"
  ON "Booking"("roomNumber")
  WHERE "status" IN ('Pending', 'Approved');


CREATE TYPE "PaymentSubmissionStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED');

CREATE TABLE "PaymentSubmission" (
  "id" SERIAL NOT NULL,
  "billId" INTEGER NOT NULL,
  "paymentReference" TEXT NOT NULL,
  "paymentNote" TEXT,
  "proofOriginalName" TEXT NOT NULL,
  "proofStorageName" TEXT NOT NULL,
  "proofMimeType" TEXT NOT NULL,
  "proofSize" INTEGER NOT NULL,
  "status" "PaymentSubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "reviewerId" INTEGER,
  "rejectionReason" TEXT,
  CONSTRAINT "PaymentSubmission_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PaymentSubmission"
  ADD CONSTRAINT "PaymentSubmission_billId_fkey"
  FOREIGN KEY ("billId") REFERENCES "PaymentBill"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PaymentSubmission"
  ADD CONSTRAINT "PaymentSubmission_reviewerId_fkey"
  FOREIGN KEY ("reviewerId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "PaymentSubmission_billId_submittedAt_idx"
  ON "PaymentSubmission"("billId", "submittedAt");

CREATE INDEX "PaymentSubmission_status_submittedAt_idx"
  ON "PaymentSubmission"("status", "submittedAt");

CREATE INDEX "PaymentSubmission_reviewerId_reviewedAt_idx"
  ON "PaymentSubmission"("reviewerId", "reviewedAt");
