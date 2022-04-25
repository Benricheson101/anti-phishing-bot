-- AlterTable
ALTER TABLE "GuildConfigs" RENAME "action" TO "phishing_action";
ALTER TABLE "GuildConfigs" ADD COLUMN "abusive_user_action" "ActionKind" NOT NULL DEFAULT E'KICK';
