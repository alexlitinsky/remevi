/*
  Warnings:

  - You are about to drop the column `back` on the `CardProgress` table. All the data in the column will be lost.
  - You are about to drop the column `cardId` on the `CardProgress` table. All the data in the column will be lost.
  - You are about to drop the column `front` on the `CardProgress` table. All the data in the column will be lost.
  - You are about to drop the column `noteId` on the `Flashcard` table. All the data in the column will be lost.
  - You are about to drop the column `flashcards` on the `StudyDeck` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,flashcardId]` on the table `CardProgress` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `flashcardId` to the `CardProgress` table without a default value. This is not possible if the table is not empty.
  - Added the required column `deckId` to the `Flashcard` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "CardProgress_userId_cardId_key";

-- AlterTable
ALTER TABLE "CardProgress" DROP COLUMN "back",
DROP COLUMN "cardId",
DROP COLUMN "front",
ADD COLUMN     "flashcardId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Flashcard" DROP COLUMN "noteId",
ADD COLUMN     "deckId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "StudyDeck" DROP COLUMN "flashcards";

-- CreateIndex
CREATE INDEX "CardProgress_flashcardId_idx" ON "CardProgress"("flashcardId");

-- CreateIndex
CREATE UNIQUE INDEX "CardProgress_userId_flashcardId_key" ON "CardProgress"("userId", "flashcardId");

-- CreateIndex
CREATE INDEX "Flashcard_deckId_idx" ON "Flashcard"("deckId");

-- CreateIndex
CREATE INDEX "Flashcard_userId_idx" ON "Flashcard"("userId");

-- AddForeignKey
ALTER TABLE "Flashcard" ADD CONSTRAINT "Flashcard_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "StudyDeck"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardProgress" ADD CONSTRAINT "CardProgress_flashcardId_fkey" FOREIGN KEY ("flashcardId") REFERENCES "Flashcard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
