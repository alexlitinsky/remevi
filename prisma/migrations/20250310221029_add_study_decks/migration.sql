-- CreateTable
CREATE TABLE "StudyDeck" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "flashcards" JSONB NOT NULL,
    "mindMap" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudyDeck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudyDeck_userId_idx" ON "StudyDeck"("userId");
