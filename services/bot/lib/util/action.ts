import {ActionKind, GuildConfigs} from '@prisma/client';
import {GuildMember} from 'discord.js';

export const doAction = async (m: GuildMember, config: GuildConfigs) => {
  let success = true;
  const DEFAULT_REASON = `Abusive user detected: ${m.user.tag}`;
  switch (config.abusiveUserAction) {
    case ActionKind.BAN: {
      try {
        await m.ban({
          reason: DEFAULT_REASON,
        });
      } catch {
        success = false;
      }

      break;
    }

    case ActionKind.KICK: {
      try {
        await m.kick(DEFAULT_REASON);
      } catch {
        success = false;
      }

      break;
    }

    case ActionKind.MUTE: {
      if (!config.muteRole) {
        success = false;
        break;
      }

      try {
        await m.roles.add(config.muteRole);
      } catch {
        success = false;
      }

      break;
    }

    case ActionKind.SOFTBAN: {
      try {
        await m.ban({
          reason: `[SOFTBAN] ${DEFAULT_REASON}`,
        });

        await m.guild.bans.remove(m.user, `[SOFTBAN] ${DEFAULT_REASON}`);
      } catch {
        success = false;
      }

      break;
    }

    case ActionKind.TIMEOUT:
      {
        try {
          await m.timeout(Number(config.timeoutDuration), DEFAULT_REASON);
        } catch {
          success = false;
        }
      }

      break;
  }

  return success;
};
