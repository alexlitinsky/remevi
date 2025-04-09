-- DropForeignKey
ALTER TABLE "StudySession" DROP CONSTRAINT "StudySession_deckId_fkey";

-- AddForeignKey
ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
