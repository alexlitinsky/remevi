/*
  Warnings:

  - You are about to drop the `CardProgress` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Flashcard` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StudyDeck` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CardProgress" DROP CONSTRAINT "CardProgress_deckId_fkey";

-- DropForeignKey
ALTER TABLE "CardProgress" DROP CONSTRAINT "CardProgress_userId_fkey";

-- DropForeignKey
ALTER TABLE "Flashcard" DROP CONSTRAINT "Flashcard_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserPreferences" DROP CONSTRAINT "UserPreferences_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserProgress" DROP CONSTRAINT "UserProgress_userId_fkey";

-- AlterTable
ALTER TABLE "UserPreferences" ADD COLUMN     "defaultDifficulty" TEXT NOT NULL DEFAULT 'medium',
ADD COLUMN     "notificationEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "theme" TEXT NOT NULL DEFAULT 'light';

-- AlterTable
ALTER TABLE "UserProgress" ADD COLUMN     "totalStudyTime" INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "CardProgress";

-- DropTable
DROP TABLE "Flashcard";

-- DropTable
DROP TABLE "StudyDeck";

-- CreateTable
CREATE TABLE "StudyMaterial" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT,
    "fileType" TEXT,
    "content" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "processingError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudyMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyContent" (
    "id" TEXT NOT NULL,
    "studyMaterialId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "difficultyLevel" TEXT NOT NULL DEFAULT 'medium',
    "shared" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudyContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlashcardContent" (
    "id" TEXT NOT NULL,
    "studyContentId" TEXT NOT NULL,
    "front" TEXT NOT NULL,
    "back" TEXT NOT NULL,

    CONSTRAINT "FlashcardContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MCQContent" (
    "id" TEXT NOT NULL,
    "studyContentId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correctOptionIndex" INTEGER NOT NULL,
    "explanation" TEXT,

    CONSTRAINT "MCQContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FillInBlankContent" (
    "id" TEXT NOT NULL,
    "studyContentId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "caseSensitive" BOOLEAN NOT NULL DEFAULT false,
    "explanation" TEXT,

    CONSTRAINT "FillInBlankContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deck" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "mindMap" JSONB,
    "isProcessing" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeckContent" (
    "id" TEXT NOT NULL,
    "deckId" TEXT NOT NULL,
    "studyContentId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DeckContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardInteraction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "studyContentId" TEXT NOT NULL,
    "sessionId" TEXT,
    "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "interval" INTEGER NOT NULL DEFAULT 0,
    "repetitions" INTEGER NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReviewed" TIMESTAMP(3),
    "streak" INTEGER NOT NULL DEFAULT 0,
    "responseTime" INTEGER,
    "difficulty" TEXT,
    "correct" BOOLEAN,
    "score" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CardInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudySession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deckId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "totalTime" INTEGER,
    "cardsStudied" INTEGER NOT NULL DEFAULT 0,
    "pointsEarned" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StudySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_StudyMaterialToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_StudyMaterialToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_StudyContentToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_StudyContentToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_DeckToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DeckToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "StudyMaterial_userId_idx" ON "StudyMaterial"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "StudyContent_studyMaterialId_idx" ON "StudyContent"("studyMaterialId");

-- CreateIndex
CREATE INDEX "StudyContent_type_idx" ON "StudyContent"("type");

-- CreateIndex
CREATE UNIQUE INDEX "FlashcardContent_studyContentId_key" ON "FlashcardContent"("studyContentId");

-- CreateIndex
CREATE UNIQUE INDEX "MCQContent_studyContentId_key" ON "MCQContent"("studyContentId");

-- CreateIndex
CREATE UNIQUE INDEX "FillInBlankContent_studyContentId_key" ON "FillInBlankContent"("studyContentId");

-- CreateIndex
CREATE INDEX "Deck_userId_idx" ON "Deck"("userId");

-- CreateIndex
CREATE INDEX "DeckContent_deckId_idx" ON "DeckContent"("deckId");

-- CreateIndex
CREATE INDEX "DeckContent_studyContentId_idx" ON "DeckContent"("studyContentId");

-- CreateIndex
CREATE UNIQUE INDEX "DeckContent_deckId_studyContentId_key" ON "DeckContent"("deckId", "studyContentId");

-- CreateIndex
CREATE INDEX "CardInteraction_userId_dueDate_idx" ON "CardInteraction"("userId", "dueDate");

-- CreateIndex
CREATE INDEX "CardInteraction_sessionId_idx" ON "CardInteraction"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "CardInteraction_userId_studyContentId_key" ON "CardInteraction"("userId", "studyContentId");

-- CreateIndex
CREATE INDEX "StudySession_userId_idx" ON "StudySession"("userId");

-- CreateIndex
CREATE INDEX "StudySession_deckId_idx" ON "StudySession"("deckId");

-- CreateIndex
CREATE INDEX "_StudyMaterialToTag_B_index" ON "_StudyMaterialToTag"("B");

-- CreateIndex
CREATE INDEX "_StudyContentToTag_B_index" ON "_StudyContentToTag"("B");

-- CreateIndex
CREATE INDEX "_DeckToTag_B_index" ON "_DeckToTag"("B");

-- AddForeignKey
ALTER TABLE "UserPreferences" ADD CONSTRAINT "UserPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProgress" ADD CONSTRAINT "UserProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyMaterial" ADD CONSTRAINT "StudyMaterial_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyContent" ADD CONSTRAINT "StudyContent_studyMaterialId_fkey" FOREIGN KEY ("studyMaterialId") REFERENCES "StudyMaterial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardContent" ADD CONSTRAINT "FlashcardContent_studyContentId_fkey" FOREIGN KEY ("studyContentId") REFERENCES "StudyContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MCQContent" ADD CONSTRAINT "MCQContent_studyContentId_fkey" FOREIGN KEY ("studyContentId") REFERENCES "StudyContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FillInBlankContent" ADD CONSTRAINT "FillInBlankContent_studyContentId_fkey" FOREIGN KEY ("studyContentId") REFERENCES "StudyContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deck" ADD CONSTRAINT "Deck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeckContent" ADD CONSTRAINT "DeckContent_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeckContent" ADD CONSTRAINT "DeckContent_studyContentId_fkey" FOREIGN KEY ("studyContentId") REFERENCES "StudyContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardInteraction" ADD CONSTRAINT "CardInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardInteraction" ADD CONSTRAINT "CardInteraction_studyContentId_fkey" FOREIGN KEY ("studyContentId") REFERENCES "StudyContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardInteraction" ADD CONSTRAINT "CardInteraction_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StudySession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StudyMaterialToTag" ADD CONSTRAINT "_StudyMaterialToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "StudyMaterial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StudyMaterialToTag" ADD CONSTRAINT "_StudyMaterialToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StudyContentToTag" ADD CONSTRAINT "_StudyContentToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "StudyContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StudyContentToTag" ADD CONSTRAINT "_StudyContentToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DeckToTag" ADD CONSTRAINT "_DeckToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Deck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DeckToTag" ADD CONSTRAINT "_DeckToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
