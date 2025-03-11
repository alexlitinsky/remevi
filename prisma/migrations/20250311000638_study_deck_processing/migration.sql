-- AlterTable
ALTER TABLE "StudyDeck" ADD COLUMN     "error" TEXT,
ADD COLUMN     "isProcessing" BOOLEAN NOT NULL DEFAULT false;
