import {ActionKind, GuildConfigs} from '@prisma/client';
import {GuildChannel, ThreadChannel, User} from 'discord.js';

import {Client} from './client';

export class Logger {
  constructor(private client: Client) {}

  async phishAction(
    guildId: string,
    user: User,
    domain: string,
    taken: string[],
    failed: string[]
  ) {
    try {
      const [channel, guild] = await this.getGuildInfo(guildId);

      if (!channel || !channel.isText() || !guild) {
        return;
      }

      await channel.send({
        content: this.genPhishingLogMessage(user, domain, taken, failed),
        allowedMentions: {parse: []},
      });
    } catch {
      //
    }
  }

  async abusiveUserAction(
    guildId: string,
    user: User,
    action: ActionKind,
    success: boolean
  ) {
    const [channel, guild] = await this.getGuildInfo(guildId);

    if (!channel || !channel.isText() || !guild) {
      return;
    }

    await channel.send({
      content: this.genAbusiveUserLogMessage(user, success, action),
      allowedMentions: {parse: []},
    });
  }

  private async getGuildInfo(
    guildId: string
  ): Promise<[GuildChannel | ThreadChannel | undefined, GuildConfigs | null]> {
    const guild = await this.client.db.guildConfigs.get(guildId);

    if (!guild?.logChannel) {
      return [undefined, guild];
    }

    const channel = this.client.guilds.cache
      .get(guildId)
      ?.channels.cache.get(guild.logChannel);

    return [channel, guild];
  }

  private genPhishingLogMessage(
    user: User,
    domain: string,
    taken: string[],
    failed: string[]
  ) {
    if (taken.length) {
      return `:hammer: Phishing URL sent by ${user} (**${user.tag}**, \`${
        user.id
      }\`). Actions: ${taken.map(a => `\`${a}\``).join(', ')} ${
        failed.length
          ? ':warning: Failed: ' + failed.map(a => `\`${a}\``).join(', ')
          : ''
      }\n> \`${domain}\``;
    } else {
      return `:warning: Unable to execute action ${failed
        .map(a => `\`${a}\``)
        .join(', ')} on user ${user} (**${user.tag}**, \`${user.id}\`).`;
    }
  }

  private genAbusiveUserLogMessage(
    user: User,
    success: boolean,
    action: ActionKind
  ) {
    if (success) {
      return `:hammer: Abusive user detected: ${user} (**${user.tag}**, \`${user.id}\`). Action taken: \`${action}\``;
    } else {
      return `:warning: Failed to run \`${action}\` action on detected abusive user: ${user} (**${user.tag}**, \`${user.id}\`).`;
    }
  }
}
