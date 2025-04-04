-- AlterTable
ALTER TABLE "Deck" ADD COLUMN     "processedChunks" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "totalChunks" INTEGER NOT NULL DEFAULT 0;
