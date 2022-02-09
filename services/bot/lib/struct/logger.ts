import {GuildConfigs} from '@prisma/client';
import {GuildChannel, ThreadChannel, User} from 'discord.js';
import {Client} from './client';

export class Logger {
  constructor(private client: Client) {}

  async action(
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
        content: this.genLogMessage(user, domain, taken, failed),
        allowedMentions: {parse: []},
      });
    } catch {
      //
    }
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

  private genLogMessage(
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
}
