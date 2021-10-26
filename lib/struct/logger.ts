import {GuildConfigs} from '@prisma/client';
import {GuildChannel, ThreadChannel, User} from 'discord.js';
import {Client} from './client';

export class Logger {
  constructor(private client: Client) {}

  async action(
    guildId: string,
    user: User,
    domain: string,
    channelSentIn: GuildChannel,
    taken: string[],
    failed: string[]
  ) {
    try {
      const [channel, guild] = await this.getGuildInfo(guildId);

      if (!channel || !channel.isText() || !guild) {
        return;
      }

      await channel.send({
        content: this.genLogMessage(
          user,
          domain,
          taken,
          channelSentIn,
          guildId,
          failed
        ),
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

  private async genLogMessage(
    user: User,
    domain: string,
    taken: string[],
    channel: string,
    guildid: string,
    failed: string[]
  ) {
    if (taken.length) {
      const defaultMessage = `:hammer: Phishing URL sent by ${user} (**${
        user.tag
      }**, \`${user.id}\`). Actions: ${taken.map(a => `\`${a}\``).join(', ')} ${
        failed.length
          ? ':warning: Failed: ' + failed.map(a => `\`${a}\``).join(', ')
          : ''
      }\n> \`${domain}\``;
      let message: string = defaultMessage;
      const guildConfig = await this.client.db.guildConfigs.get(guildid);
      if (guildConfig.logFormat && guildConfig.logFormat.length > 0) {
        const logFormat = guildConfig.logFormat;
        const actions = taken.map(a => `\`${a}\``).join(', ');
        message = logFormat
          .replace('{actions}', actions)
          .replace('{domain}', domain)
          .replace('{offender}', `<@!${user.id.toString()}>`)
          .replace('{offenderTag}', user.tag)
          .replace('{offenderId}', user.id.toString())
          .replace('{channel}', `<#${channel}>`)
          .replace('{newline}', '\n');
      }
      return message;
    } else {
      return `:warning: Unable to execute action ${failed
        .map(a => `\`${a}\``)
        .join(', ')} on user ${user} (**${user.tag}**, \`${user.id}\`).`;
    }
  }
}
