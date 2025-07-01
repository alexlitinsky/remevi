-- DropIndex
DROP INDEX "User_email_key";

-- CreateTable
CREATE TABLE "ChunkPartStorage" (
    "id" TEXT NOT NULL,
    "deckId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "partIndex" INTEGER NOT NULL,
    "totalParts" INTEGER NOT NULL,
    "partData" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChunkPartStorage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChunkPartStorage_deckId_chunkIndex_partIndex_idx" ON "ChunkPartStorage"("deckId", "chunkIndex", "partIndex");

-- CreateIndex
CREATE INDEX "ChunkPartStorage_createdAt_idx" ON "ChunkPartStorage"("createdAt");
