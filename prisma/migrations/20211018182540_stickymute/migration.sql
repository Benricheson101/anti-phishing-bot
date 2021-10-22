/*  Non Destructive Migration
    - STICKYMUTE
    - CHANNEL Exemptions
    - Levels delete, log level, and notify

    Warning:
      This is an advanced prisma migration that perserves the current
      "delete" and "notify" columns and converts their current data to:
      - true  » 'YES'::"Level"
      - false » 'NO'::"Level"

      If you delete and regenerate the migration it will be a basic autogen
      migration tyat drops both columns and recreates them. You will need to
      add the data conversion before using.
*/

-- CreateEnum
CREATE TYPE "Level" AS ENUM ('ALWAYS', 'YES', 'NO');

-- AlterEnum
ALTER TYPE "ActionKind" ADD VALUE 'STICKYMUTE';

-- AlterEnum
ALTER TYPE "ExemptionKind" ADD VALUE 'CHANNEL' BEFORE 'USER';

/* UNIQUE INDEX replaced w/ PRIMARY KEY INDEX */
-- DropIndex
DROP INDEX "Domains_domain_key";

-- AlterTable
ALTER TABLE "Domains" ADD CONSTRAINT "Domains_pkey" PRIMARY KEY ("domain");

/* UNIQUE INDEX replaced w/ PRIMARY KEY INDEX in following action*/
-- DropIndex
DROP INDEX "Exemptions_id_guild_id_key";

-- AlterTable
ALTER TABLE "Exemptions" ADD CONSTRAINT "Exemptions_pkey" PRIMARY KEY ("id", "guild_id");

/* UNIQUE INDEX replaced w/ PRIMARY KEY INDEX in following action*/
-- DropIndex
DROP INDEX "GuildConfigs_id_key" CASCADE;

/* No destructive ALTER TABLE:
   perserves "delete" and "notify"
*/
-- AlterTable
ALTER TABLE "GuildConfigs" ADD CONSTRAINT "GuildConfigs_pkey" PRIMARY KEY ("id"),
ADD COLUMN "log_level" "Level" DEFAULT 'NO'::"Level",
/* Destructive basic autogen:
DROP COLUMN "delete",
ADD COLUMN "delete" "Level" DEFAULT E'YES',
*/
ALTER COLUMN "delete" DROP DEFAULT,
ALTER COLUMN "delete" SET DATA TYPE "Level" 
  USING CASE WHEN "delete" THEN 'YES'::"Level" ELSE 'NO'::"Level" END,
ALTER COLUMN "delete" SET DEFAULT 'YES'::"Level",
/* Destructive basic autogen
DROP COLUMN "notify",
ADD COLUMN "notify" "Level" DEFAULT E'NO',
*/
ALTER COLUMN "notify" DROP DEFAULT,
ALTER COLUMN "notify" SET DATA TYPE "Level" 
  USING CASE WHEN "notify" THEN 'YES'::"Level" ELSE 'NO'::"Level" END,
ALTER COLUMN "notify" SET DEFAULT 'NO'::"Level";

-- CreateTable
CREATE TABLE "Muted" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,

    CONSTRAINT "Muted_pkey" PRIMARY KEY ("id","guild_id")
);

/* CASCADE on UPDATE and DELETE
   - UPDATE: guild_id is updated if GuildConfigs.id is updated
   - DELETE: Exemptions are deleted if the GuildConfigs entry is deleted
   
   Previous setting would obstruct a GuildConfig from being deleted if
   there were exemptions
*/

-- AddForeignKey
ALTER TABLE "Exemptions" ADD CONSTRAINT "Exemptions_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "GuildConfigs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Muted" ADD CONSTRAINT "Muted_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "GuildConfigs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
