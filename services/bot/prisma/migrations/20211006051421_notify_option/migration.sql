/*
  Warnings:

  - The primary key for the `Domains` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Domains` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Domains" DROP CONSTRAINT "Domains_pkey",
DROP COLUMN "id";

-- AlterTable
ALTER TABLE "GuildConfigs" ADD COLUMN     "notify" BOOLEAN DEFAULT false;
