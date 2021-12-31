import {Client, DOMAIN_REGEX} from '..';
import {fetch, request} from 'undici';
import {createHash} from 'crypto';

const DISCORD_BAD_DOMAINS =
  'https://cdn.discordapp.com/bad-domains/hashes.json';

export class DomainManager {
  shorteners = new Set<string>();
  domains = new Set<string>();

  maxAttempts = 5;

  failedAttempts = 0;

  fetchInterval = 1_000 * 60 * 5; // 5 minutes
  clearFailuresTimeout = 1_000 * 60 * 60; // 60 minutes

  fetchTimer?: NodeJS.Timeout;
  clearFailuresTimer?: NodeJS.Timeout;

  constructor(private client: Client) {}

  async run() {
    try {
      const domainList = await this.getScamDomains();

      if (domainList.length) {
        // If the domain list size drops by a significant amount, it likely means the API died
        // and a lot of domains are missing, so don't update the stored list
        if (
          this.domains.size > 0 &&
          this.domains.size * 0.75 > domainList.length
        ) {
          return;
        }

        this.domains = new Set(domainList);
      }

      this.client.metrics.updateDomainCount(this.domains.size);
      this.client.metrics.domainsFetched(true, domainList.length);
    } catch (e) {
      console.error('Unable to fetch domains:', e);
      this.client.metrics.domainsFetched(false);

      // Automatically stop the domain fetcher if the api errors 5 times in an hour
      // Every time there is a failed request, the hour starts over. This should prevent
      // the bot from making unnecessary requests if the api has gone down for a long period of time,
      // while also accounting for short downtimes

      this.failedAttempts++;
      if (this.failedAttempts >= this.maxAttempts) {
        console.error(
          `DomainFetcher encountered ${this.failedAttempts} and has automatically shut down.`
        );

        this.down();
      }

      if (this.clearFailuresTimer) {
        clearInterval(this.clearFailuresTimer);
      }

      this.clearFailuresTimer = setTimeout(
        (() => {
          this.failedAttempts = 0;
        }).bind(this),
        this.fetchInterval
      );
    }
  }

  async up() {
    try {
      const shorteners = await this.getShorteners();
      this.shorteners = new Set(shorteners);

      await this.run();
      this.fetchTimer = setInterval(this.run.bind(this), this.fetchInterval);
    } catch (e) {
      console.error('Error starting domain fetcher:', e);
    }
  }

  down() {
    if (this.fetchTimer) {
      console.log('Stopping automatic domain fetching.');
      clearInterval(this.fetchTimer);
      this.fetchTimer = undefined;
    }

    if (this.clearFailuresTimer) {
      clearInterval(this.clearFailuresTimer);
    }
  }

  async test(
    msg: string,
    redird = false
  ): Promise<{domain: string; isRedir: boolean}[]> {
    const domains = Array.from(msg.matchAll(DOMAIN_REGEX)).filter(
      (d, i, self) => i === self.findIndex(a => a[0] === d[0])
    );

    const hasMatch = domains.filter(d =>
      this.domains.has(createHash('sha256').update(d[1]).digest('hex'))
    );

    if (hasMatch.length) {
      return hasMatch.map(d => ({domain: d[1], isRedir: redird}));
    }

    const isRedir = domains.filter(d => this.shorteners.has(d[1]));

    if (isRedir.length) {
      const redirected = await Promise.all(isRedir.map(getLastRedirectPage));
      const redirectedUrls = redirected.filter(Boolean) as string[];
      return Promise.all(
        redirectedUrls.map(async a => (await this.test(a, true))[0])
      ).then(a => a.filter(Boolean));
    }

    return [];
  }

  async getScamDomains(): Promise<string[]> {
    let domains: string[] = [];
    const {body: phishApiBody, statusCode: phishApiStatusCode} = await request(
      process.env.API_URL!
    );

    if (phishApiStatusCode > 300 || phishApiStatusCode < 200) {
      throw new Error(`phish api responded with status: ${phishApiStatusCode}`);
    }

    const fromPhishApi: string[] = await phishApiBody.json();
    domains = domains.concat(
      fromPhishApi.map(d => createHash('sha256').update(d).digest('hex'))
    );

    const {body: discordDomainBody, statusCode: discordDomainStatusCode} =
      await request(DISCORD_BAD_DOMAINS);

    if (discordDomainStatusCode > 300 || discordDomainStatusCode < 200) {
      throw new Error(
        `discord bad domain list responded with status: ${discordDomainStatusCode}`
      );
    }

    const fromDiscord: string[] = await discordDomainBody.json();
    domains = domains.concat(fromDiscord);

    this.client.metrics.updateDomainCount(fromPhishApi.length, 'phish_api');
    this.client.metrics.updateDomainCount(fromDiscord.length, 'discord');

    return domains;
  }

  async getShorteners(): Promise<string[]> {
    const shortenerList =
      'https://raw.githubusercontent.com/nwunderly/ouranos/master/shorteners.txt';

    const {body, statusCode} = await request(shortenerList);

    if (statusCode > 300 || statusCode < 200) {
      throw new Error(`shortener list responded with status: ${statusCode}`);
    }

    const shorteners = await body.text();
    const s = shorteners.split('\n').map(s => s.trim());

    this.client.metrics.updateShortenerCount(s.length);

    return s;
  }
}

async function getLastRedirectPage(
  domain: RegExpMatchArray
): Promise<string | undefined> {
  if (!domain[1] || !domain[2]) {
    return;
  }

  const u = `https://${domain[1]}/${domain[2] || ''}`;

  try {
    const {redirected, url} = await fetch(u, {
      method: 'HEAD',
      redirect: 'follow',
    });

    if (redirected) {
      return url;
    }
  } catch {
    try {
      const {headers} = await request(u);
      const location = headers.location;
      if (location) {
        return location;
      }
    } catch {
      // FIXME: invalid domains end up here
    }
  }

  return;
}
