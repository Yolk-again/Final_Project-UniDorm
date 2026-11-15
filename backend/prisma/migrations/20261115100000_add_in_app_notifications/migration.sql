CREATE TYPE "NotificationType" AS ENUM (
  'BILL_CREATED',
  'PAYMENT_SUBMITTED',
  'PAYMENT_APPROVED',
  'PAYMENT_REJECTED',
  'BOOKING_REQUESTED',
  'BOOKING_APPROVED',
  'BOOKING_REJECTED',
  'ANNOUNCEMENT_PUBLISHED',
  'CHAT_MESSAGE',
  'ROOM_AVAILABLE'
);

CREATE TABLE "Notification" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "type" "NotificationType" NOT NULL,
  "title" VARCHAR(140) NOT NULL,
  "message" VARCHAR(500) NOT NULL,
  "link" VARCHAR(240),
  "entityId" INTEGER,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notification_userId_readAt_createdAt_idx"
  ON "Notification"("userId", "readAt", "createdAt");
CREATE INDEX "Notification_type_createdAt_idx"
  ON "Notification"("type", "createdAt");

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
