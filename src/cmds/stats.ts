import {CommandInteraction} from 'discord.js';
import {Command, Database} from 'fish';

export class StatsCommand extends Command {
  name = 'stats';
  description = 'Get statistics about the bot.';
  options = [];

  async run(i: CommandInteraction) {
    const {db}: {db: Database} = i.client;

    const hits = await db.domains.top(10);

    const longest = Math.max(...hits.map(d => d.domain.length));
    const topHits = hits
      .map(
        (d, i) =>
          `${`${i + 1}.`.padEnd(4)}${d.domain.padEnd(longest)} => ${d.hits}`
      )
      .join('\n');

    const totalDomains = await db.domains.count();
    const totalHits = await db.domains.totalHits();

    const msg = `\`\`\`md
    => Domains Loaded: ${totalDomains}
    => Total Hits: ${totalHits}

    -- Top Domains --
    ${topHits}
    \`\`\``
      .replace(/^ +/gm, '')
      .trim();

    await i.reply({
      content: msg,
      ephemeral: true,
    });
  }
}
