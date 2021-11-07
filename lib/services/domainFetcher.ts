import {Client, DOMAIN_REGEX} from '..';
import {fetch, request} from 'undici';

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
      const domainList = await getScamDomains();

      this.domains = new Set(domainList);

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
      const shorteners = await getShorteners();
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

  async test(msg: string): Promise<string[]> {
    const domains = Array.from(msg.matchAll(DOMAIN_REGEX)).filter(
      (d, i, self) => i === self.findIndex(a => a[0] === d[0])
    );

    const hasMatch = domains.filter(d => this.domains.has(d[1]));

    if (hasMatch.length) {
      return hasMatch.map(d => d[1]);
    }

    const isRedir = domains.filter(d => this.shorteners.has(d[1]));

    if (isRedir.length) {
      const redirected = await Promise.all(isRedir.map(getLastRedirectPage));
      const redirectedUrls = redirected.filter(Boolean) as string[];
      return Promise.all(
        redirectedUrls.map(async a => (await this.test(a))[0])
      ).then(a => a.filter(Boolean));
    }

    return [];
  }
}

async function getScamDomains(): Promise<string[]> {
  const {body, statusCode} = await request(process.env.API_URL!);

  if (statusCode > 300 || statusCode < 200) {
    throw new Error(`server responded with status: ${statusCode}`);
  }

  return body.json();
}

async function getShorteners(): Promise<string[]> {
  const shortenerList =
    'https://raw.githubusercontent.com/nwunderly/ouranos/master/shorteners.txt';

  const {body, statusCode} = await request(shortenerList);

  if (statusCode > 300 || statusCode < 200) {
    throw new Error(`server responded with status: ${statusCode}`);
  }

  const shorteners = await body.text();

  return shorteners.split('\n').map(s => s.trim());
}

async function getLastRedirectPage(
  domain: RegExpMatchArray
): Promise<string | undefined> {
  if (!domain[1] || !domain[2]) {
    return;
  }

  const u = `https://${domain[1]}/${domain[2] || ''}`;

  const {redirected, url} = await fetch(u, {
    method: 'HEAD',
    redirect: 'follow',
  });

  if (redirected) {
    return url;
  }

  return;
}
