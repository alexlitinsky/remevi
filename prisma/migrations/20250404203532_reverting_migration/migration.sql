/*
  Warnings:

  - You are about to drop the column `processedChunks` on the `Deck` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Deck` table. All the data in the column will be lost.
  - You are about to drop the column `totalChunks` on the `Deck` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Deck" DROP COLUMN "processedChunks",
DROP COLUMN "status",
DROP COLUMN "totalChunks";
