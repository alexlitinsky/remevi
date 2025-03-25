-- AlterTable
ALTER TABLE "CardInteraction" ADD COLUMN     "masteryLevel" TEXT NOT NULL DEFAULT 'new';

-- AlterTable
ALTER TABLE "StudySession" ADD COLUMN     "averageResponseTime" INTEGER,
ADD COLUMN     "correctCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "incorrectCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "StudySession_startTime_idx" ON "StudySession"("startTime");
