-- CreateEnum
CREATE TYPE "ActionKind" AS ENUM ('BAN', 'SOFTBAN', 'KICK', 'MUTE', 'NONE');

-- CreateEnum
CREATE TYPE "ExemptionKind" AS ENUM ('USER', 'ROLE');

-- CreateTable
CREATE TABLE "Domains" (
    "id" SERIAL NOT NULL,
    "domain" TEXT NOT NULL,
    "hits" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildConfigs" (
    "id" TEXT NOT NULL,
    "delete" BOOLEAN NOT NULL DEFAULT true,
    "action" "ActionKind" NOT NULL DEFAULT E'NONE',
    "log_channel" TEXT,
    "mute_role" TEXT
);

-- CreateTable
CREATE TABLE "Exemptions" (
    "id" TEXT NOT NULL,
    "kind" "ExemptionKind" NOT NULL,
    "guild_id" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Domains_domain_key" ON "Domains"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "GuildConfigs_id_key" ON "GuildConfigs"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Exemptions_id_guild_id_key" ON "Exemptions"("id", "guild_id");

-- AddForeignKey
ALTER TABLE "Exemptions" ADD CONSTRAINT "Exemptions_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "GuildConfigs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
