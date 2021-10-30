import {GuildConfigs} from '@prisma/client';
import {
  GuildChannel,
  ThreadChannel,
  TextChannel,
  NewsChannel,
  User,
} from 'discord.js';
import {Client} from './client';

export class Logger {
  constructor(private client: Client) {}

  async action(
    guildId: string,
    user: User,
    domain: string,
    channelSentIn: GuildChannel | ThreadChannel | TextChannel | NewsChannel,
    taken: string[],
    failed: string[]
  ) {
    try {
      const [channel, guild] = await this.getGuildInfo(guildId);

      if (!channel || !channel.isText() || !guild) {
        return;
      }

      await channel.send({
        content: await this.genLogMessage(
          user,
          domain,
          taken,
          channelSentIn.id.toString(),
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
      if (
        guildConfig &&
        guildConfig.logFormat &&
        guildConfig.logFormat.length > 0
      ) {
        const logFormat = guildConfig.logFormat;
        const actions = `${taken.map(a => `\`${a}\``).join(', ')} ${
          failed.length
            ? ':warning: Failed: ' + failed.map(a => `\`${a}\``).join(', ')
            : ''
        }`;
        message = logFormat
          .replace(/{actions}/g, actions)
          .replace(/{domain}/g, domain)
          .replace(/{offender}/g, `${user} (**${user.tag}**, \`${user.id}\`)`)
          .replace(/{offenderTag}/g, user.tag)
          .replace(/{offenderId}/g, user.id.toString())
          .replace(/{channel}/g, `<#${channel}>`)
          .replace(/{newline}/g, '\n');
      }
      return message;
    } else {
      return `:warning: Unable to execute action ${failed
        .map(a => `\`${a}\``)
        .join(', ')} on user ${user} (**${user.tag}**, \`${user.id}\`).`;
    }
  }
}
