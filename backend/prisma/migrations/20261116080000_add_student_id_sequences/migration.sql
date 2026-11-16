CREATE TABLE "StudentIdSequence" (
  "prefix" VARCHAR(8) NOT NULL,
  "nextSequence" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudentIdSequence_pkey" PRIMARY KEY ("prefix"),
  CONSTRAINT "StudentIdSequence_prefix_format_check" CHECK ("prefix" ~ '^[0-9]{8}$'),
  CONSTRAINT "StudentIdSequence_next_sequence_check" CHECK ("nextSequence" BETWEEN 1 AND 100)
);

INSERT INTO "StudentIdSequence" ("prefix", "nextSequence", "createdAt", "updatedAt")
SELECT LEFT("studentId", 8), MAX(SUBSTRING("studentId", 9, 2)::INTEGER) + 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "User"
WHERE "role" = 'student' AND "studentId" ~ '^[0-9]{10}$'
GROUP BY LEFT("studentId", 8)
ON CONFLICT ("prefix") DO NOTHING;
