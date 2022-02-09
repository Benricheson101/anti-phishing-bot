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
    // defer because checking redirects is sometimes slow
    await i.deferReply({ephemeral: true});

    const domain = i.options.getString('domain', true);
    const results = await this.client.services.domainManager.test(domain);

    if (results.length) {
      const fmtd = results
        .map(
          r =>
            `${r.isKnown ? ':white_check_mark:' : ':x:'} ${
              r.isRedir ? ':twisted_rightwards_arrows:' : ':arrow_right:'
            } Domain: \`${r.domain}\``
        )
        .join('\n');
      await i.followUp({content: fmtd, ephemeral: true});
    } else {
      await i.followUp({
        content: ':x: No domains found in the specified input text.',
        ephemeral: true,
      });
    }
  }
}
