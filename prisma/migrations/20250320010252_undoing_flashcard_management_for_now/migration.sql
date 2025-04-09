/*
  Warnings:

  - You are about to drop the column `flashcardId` on the `CardProgress` table. All the data in the column will be lost.
  - You are about to drop the column `deckId` on the `Flashcard` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,cardId]` on the table `CardProgress` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `back` to the `CardProgress` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cardId` to the `CardProgress` table without a default value. This is not possible if the table is not empty.
  - Added the required column `front` to the `CardProgress` table without a default value. This is not possible if the table is not empty.
  - Added the required column `noteId` to the `Flashcard` table without a default value. This is not possible if the table is not empty.
  - Added the required column `flashcards` to the `StudyDeck` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "CardProgress" DROP CONSTRAINT "CardProgress_flashcardId_fkey";

-- DropForeignKey
ALTER TABLE "Flashcard" DROP CONSTRAINT "Flashcard_deckId_fkey";

-- DropIndex
DROP INDEX "CardProgress_flashcardId_idx";

-- DropIndex
DROP INDEX "CardProgress_userId_flashcardId_key";

-- DropIndex
DROP INDEX "Flashcard_deckId_idx";

-- DropIndex
DROP INDEX "Flashcard_userId_idx";

-- AlterTable
ALTER TABLE "CardProgress" DROP COLUMN "flashcardId",
ADD COLUMN     "back" TEXT NOT NULL,
ADD COLUMN     "cardId" TEXT NOT NULL,
ADD COLUMN     "front" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Flashcard" DROP COLUMN "deckId",
ADD COLUMN     "noteId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "StudyDeck" ADD COLUMN     "flashcards" JSONB NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "CardProgress_userId_cardId_key" ON "CardProgress"("userId", "cardId");
