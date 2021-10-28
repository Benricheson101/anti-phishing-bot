import {GuildConfigs} from '@prisma/client';
import {Message} from 'discord.js';

export class Logger {
  async action(
    message: Message,
    config: GuildConfigs,
    domains: string[],
    taken: string[],
    failed: string[]
  ) {
    const {guild} = message;
    const channel = guild?.channels.resolve(config.logChannel!);
    if (!channel || !channel.isText()) {
      return;
    }

    const user = message.author;
    const content = `:hammer: Phishing URL sent by ${user} (**${
      user.tag
    }**) \`${user.id}\` in <#${message.channelId}>\nACTIONS:${taken.reduce(
      (s, a) => `${s}\n\`- ${a}\``,
      ''
    )}${failed.reduce(
      (s, a) => `${s}\n\`- ${a} (FAILED)\``,
      ''
    )}${domains.reduce((s, d) => `${s}\n\`- ${d}\``, '\nDOMAINS:')}`;

    channel
      .send({
        content,
        allowedMentions: {parse: []},
      })
      .catch(console.error);
  }
}
