import {CommandInteraction} from 'discord.js';
import {Command} from 'fish';
import {request} from 'undici';

export class StatsCommand extends Command {
  name = 'stats';
  description = 'Get statistics about the bot.';
  options = [];

  async run(i: CommandInteraction) {
    const top10 = await getDataFromPrometheus<{
      domain: string;
      group: string;
      instance: string;
      job: string;
      service: string;
    }>('sort_desc(topk(10,increase(domain_hits[24h])))');

    const total24h = await getDataFromPrometheus(
      'sum(increase(domain_hits[24h]))'
    );

    const total = Math.round(
      parseFloat(total24h.data.result?.[0].value[1] || '0')
    );

    const topDomains = top10.data.result
      .map(r => ({
        domain: r.metric.domain,
        hits: Math.round(parseFloat(r.value[1])),
      }))
      .filter(d => d.hits);

    const longest = Math.max(...topDomains.map(d => d.domain.length));

    const topHits = topDomains
      .map(
        (d, i) =>
          `${`${i + 1}.`.padEnd(
            topDomains.length >= 10 ? 4 : 3
          )}${d.domain.padEnd(longest)} => ${d.hits}`
      )
      .join('\n');

    const msg = `\`\`\`md
    => Domains Loaded: ${this.client.services.domainManager.domains.size}
    => Total Hits (24h): ${total}

    -- Top Domains (24h) --
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

async function getDataFromPrometheus<T = {}>(
  query: string
): Promise<PrometheusQueryResult<T>> {
  const {body} = await request(
    `http://prometheus:9090/api/v1/query?query=${encodeURIComponent(query)}`
  );
  return body.json();
}

interface PrometheusQueryResult<T = {}> {
  status: string;
  data: {
    resultType: 'vector';
    result: {
      metric: T;
      value: [number, string];
    }[];
  };
}
