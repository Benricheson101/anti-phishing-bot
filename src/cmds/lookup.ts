import {ApplicationCommandOptionType} from 'discord-api-types';
import {CommandInteraction} from 'discord.js';
import {Command} from 'fish';

export class LookupCommand extends Command {
  name = 'lookup';
  description = 'Check if a domain is a known scam page.';
  options = [
    {
      name: 'domain',
      description: 'The domain to lookup',
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ];

  async run(i: CommandInteraction) {
    const domain = i.options.getString('domain', true);

    const info = await i.client.db.domains.get(domain);

    if (info) {
      const msg = `
      Domain: \`${info.domain}\`
      Added: <t:${Math.floor(info.createdAt.getTime() / 1000)}:R>
      Hits: \`${info.hits}\`
      `
        .replace(/^ +/gm, '')
        .trim();

      await i.reply({content: msg, ephemeral: true});
    } else {
      await i.reply({
        content: ':x: That is not a known domain.',
        ephemeral: true,
      });
    }
  }
}
