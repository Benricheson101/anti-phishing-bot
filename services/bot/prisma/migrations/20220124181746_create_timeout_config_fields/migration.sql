/*
  Warnings:

  - You are about to drop the `Domains` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
ALTER TYPE "ActionKind" ADD VALUE 'TIMEOUT';

-- AlterTable
ALTER TABLE "GuildConfigs" ADD COLUMN     "timeout_duration" BIGINT NOT NULL DEFAULT 604800000;

-- DropTable
DROP TABLE "Domains";
