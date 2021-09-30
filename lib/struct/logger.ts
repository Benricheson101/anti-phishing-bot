import {GuildConfigs} from '@prisma/client';
import {GuildChannel, ThreadChannel, User} from 'discord.js';
import {Client} from './client';

export class Logger {
  constructor(private client: Client) {}

  async action(guildId: string, user: User, domain: string) {
    try {
      const [channel, guild] = await this.getGuildInfo(guildId);

      if (!channel || !channel.isText() || !guild) {
        return;
      }

      await channel.send({
        content: this.genLogMessage(guild, user, domain),
        allowedMentions: {parse: []},
      });
    } catch {
      //
    }
  }

  async error(guildId: string, user: User) {
    try {
      const [channel, guild] = await this.getGuildInfo(guildId);

      if (!channel || !channel.isText() || !guild) {
        return;
      }

      const actions: string[] = [];

      if (guild.delete) {
        actions.push('DELETE');
      }

      if (guild.action !== 'NONE' || !actions.length) {
        actions.push(guild.action);
      }

      const msg = `:warning: Unable to execute action ${actions
        .map(a => `\`${a}\``)
        .join(', ')} on user ${user} (**${user.tag}**, \`${user.id}\`).`;

      await channel.send({
        content: msg,
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

  private genLogMessage(config: GuildConfigs, user: User, domain: string) {
    const actions: string[] = [];

    if (config.delete) {
      actions.push('DELETE');
    }

    if (config.action !== 'NONE' || !actions.length) {
      actions.push(config.action);
    }

    return `:hammer: Phishing URL sent by ${user} (**${user.tag}**, \`${
      user.id
    }\`). Actions: ${actions.map(a => `\`${a}\``).join(', ')}\n> \`${domain}\``;
  }
}
