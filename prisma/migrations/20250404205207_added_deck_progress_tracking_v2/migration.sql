-- AlterTable
ALTER TABLE "Deck" ADD COLUMN     "processedChunks" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "processingProgress" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "processingStage" TEXT NOT NULL DEFAULT 'CHUNKING',
ADD COLUMN     "totalChunks" INTEGER NOT NULL DEFAULT 0;
