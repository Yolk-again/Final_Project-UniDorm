-- Add the core integrity constraints without rejecting legacy rows. The original
-- dataset can contain historical bookings/bills with deleted or unmatched records.
-- NOT VALID preserves that history while PostgreSQL enforces each constraint for
-- new rows and changed references. Legacy exceptions should be reconciled separately.


ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "User"("studentId")
  ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;

ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_roomNumber_fkey"
  FOREIGN KEY ("roomNumber") REFERENCES "Room"("roomNumber")
  ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;

ALTER TABLE "PaymentBill"
  ADD CONSTRAINT "PaymentBill_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "User"("studentId")
  ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;

ALTER TABLE "PaymentBill"
  ADD CONSTRAINT "PaymentBill_roomNumber_fkey"
  FOREIGN KEY ("roomNumber") REFERENCES "Room"("roomNumber")
  ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;

ALTER TABLE "Room"
  ADD CONSTRAINT "Room_price_positive_check" CHECK ("price" > 0) NOT VALID;

ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_price_positive_check" CHECK ("price" > 0) NOT VALID;

ALTER TABLE "PaymentBill"
  ADD CONSTRAINT "PaymentBill_amount_positive_check" CHECK ("amount" > 0) NOT VALID;

ALTER TABLE "PaymentSubmission"
  ADD CONSTRAINT "PaymentSubmission_proofSize_check"
  CHECK ("proofSize" BETWEEN 1 AND 5242880) NOT VALID;

ALTER TABLE "PaymentSubmission"
  ADD CONSTRAINT "PaymentSubmission_proof_type_check"
  CHECK ("proofMimeType" IN ('image/jpeg', 'image/png', 'application/pdf')) NOT VALID;

ALTER TABLE "PaymentBill"
  ADD CONSTRAINT "PaymentBill_submitted_has_proof_check"
  CHECK (
    "status" <> 'SUBMITTED'
    OR (
      "proofStorageName" IS NOT NULL
      AND "proofMimeType" IN ('image/jpeg', 'image/png', 'application/pdf')
      AND "proofSize" BETWEEN 1 AND 5242880
      AND "submittedAt" IS NOT NULL
    )
  ) NOT VALID;

CREATE INDEX "PaymentBill_roomNumber_idx" ON "PaymentBill"("roomNumber");

-- A bill can have only one submission awaiting review at a time, even under
-- concurrent requests. Rejected/approved submissions remain in the history.
CREATE UNIQUE INDEX "PaymentSubmission_one_submitted_per_bill_idx"
  ON "PaymentSubmission"("billId")
  WHERE "status" = 'SUBMITTED';
