CREATE TABLE "AnnouncementReadReceipt" (
    "id" SERIAL NOT NULL,
    "announcementId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnouncementReadReceipt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AnnouncementReadReceipt_announcementId_userId_key"
ON "AnnouncementReadReceipt"("announcementId", "userId");

CREATE INDEX "AnnouncementReadReceipt_userId_readAt_idx"
ON "AnnouncementReadReceipt"("userId", "readAt");

ALTER TABLE "AnnouncementReadReceipt"
ADD CONSTRAINT "AnnouncementReadReceipt_announcementId_fkey"
FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AnnouncementReadReceipt"
ADD CONSTRAINT "AnnouncementReadReceipt_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
