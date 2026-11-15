CREATE TABLE "ChatReadReceipt" (
    "id" SERIAL NOT NULL,
    "chatKey" TEXT NOT NULL,
    "userRole" "Role" NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReadMessageId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatReadReceipt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ChatReadReceipt_chatKey_userRole_userId_key"
ON "ChatReadReceipt"("chatKey", "userRole", "userId");

CREATE INDEX "ChatReadReceipt_userRole_userId_lastReadAt_idx"
ON "ChatReadReceipt"("userRole", "userId", "lastReadAt");

ALTER TABLE "ChatReadReceipt"
ADD CONSTRAINT "ChatReadReceipt_chatKey_fkey"
FOREIGN KEY ("chatKey") REFERENCES "ChatThread"("chatKey")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve read markers saved by the earlier admin-only implementation.
INSERT INTO "ChatReadReceipt" ("chatKey", "userRole", "userId", "lastReadAt", "lastReadMessageId")
SELECT thread."chatKey", 'admin'::"Role", thread."adminId", thread."adminLastReadAt", COALESCE(latest."id", 0)
FROM "ChatThread" AS thread
LEFT JOIN LATERAL (
    SELECT message."id"
    FROM "ChatMessage" AS message
    WHERE message."chatKey" = thread."chatKey"
      AND message."createdAt" <= thread."adminLastReadAt"
    ORDER BY message."createdAt" DESC, message."id" DESC
    LIMIT 1
) AS latest ON TRUE
WHERE thread."adminId" IS NOT NULL AND thread."adminLastReadAt" IS NOT NULL
ON CONFLICT ("chatKey", "userRole", "userId") DO NOTHING;
