import {CommandInteraction} from 'discord.js';
import {Command} from 'fish';
import {request} from 'undici';

export class StatsCommand extends Command {
  name = 'stats';
  description = 'Get statistics about the bot.';
  options = [];

  async run(i: CommandInteraction) {
    try {
      const top10 = await queryPrometheus<{
        __name__: string;
        group: string;
        instance: string;
        job: string;
        service: string;
        domain: string;
        was_redirect: `${boolean}` | '';
      }>('sum by (domain) (topk(10, increase(domain_hits[24h])))');

      const hits24h = await queryPrometheus<{
        __name__: string;
        group: string;
        instance: string;
        job: string;
        service: string;
        domain: string;
        was_redirect: `${boolean}` | '';
      }>('sum by (was_redirect) (increase(domain_hits[24h]))');

      const domainCount = await queryPrometheus<{
        __name__: string;
        group: string;
        instance: string;
        job: string;
        service: string;
        source: 'discord' | 'phish_api' | '';
      }>('domain_count').then(d => d.data.result);

      const roundPromResult = (
        d?: PrometheusQueryResult['data']['result'][number]
      ) => (d ? Math.round(parseFloat(d.value[1])) : 0);

      const totalDomains = roundPromResult(
        domainCount.find(d => !d.metric.source)
      );

      const domainsFromDiscord = roundPromResult(
        domainCount.find(d => d.metric.source === 'discord')
      );
      const domainsFromPhishApi = roundPromResult(
        domainCount.find(d => d.metric.source === 'phish_api')
      );

      const directHit24h = Math.round(
        hits24h.data.result
          .filter(d => d.metric?.was_redirect !== 'true')
          .reduce((p, c) => p + parseFloat(c.value[1]), 0)
      );

      const redirectHit24h = Math.round(
        hits24h.data.result
          .filter(d => d.metric?.was_redirect === 'true')
          .reduce((p, c) => p + parseFloat(c.value[1]), 0)
      );

      const totalHits24h = directHit24h + redirectHit24h;

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
        => Total Domains: ${totalDomains}
          - Phish API  : ${domainsFromPhishApi}
          - Discord CDN: ${domainsFromDiscord}

        => Total Hits (24h): ${totalHits24h}
          - Direct  : ${directHit24h}
          - Redirect: ${redirectHit24h}

        -- Top Domains (24h) --
        ${topHits}
      \`\`\``
        .replace(/^ {0,8}/gm, '')
        .trim();

      await i.reply({
        content: msg,
        ephemeral: true,
      });
    } catch {
      await i.reply({
        content: ':x: Failed to retrieve stats',
        ephemeral: true,
      });
    }
  }
}

async function queryPrometheus<T = {}>(
  query: string
): Promise<PrometheusQueryResult<T>> {
  const {body} = await request(
    `${process.env.PROMETHEUS_URL!}/api/v1/query?query=${encodeURIComponent(
      query
    )}`,
    {method: 'GET', headersTimeout: 2_000}
  );
  return body.json();
}

interface PrometheusQueryResult<T = {}> {
  status: string;
  data: {
    resultType: 'vector';
    result: {
      metric: {} & T;
      value: [number, string];
    }[];
  };
}
