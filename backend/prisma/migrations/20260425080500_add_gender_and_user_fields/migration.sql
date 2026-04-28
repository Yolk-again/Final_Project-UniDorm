-- DropIndex
DROP INDEX "User_email_key";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "gender" TEXT,
ALTER COLUMN "email" DROP NOT NULL;
