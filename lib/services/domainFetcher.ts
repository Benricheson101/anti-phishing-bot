import {request, RequestOptions} from 'https';
import {URL} from 'url';
import {Client} from '..';

const API_URL = new URL(process.env.API_URL!);

const OPTIONS: RequestOptions = {
  method: 'GET',
  hostname: API_URL.hostname,
  path: API_URL.pathname,
  port: API_URL.port,
};

export class DomainFetcher {
  attempts = 5;

  failedAttempts = 0;

  interval = 5 * 1_000 * 60; // 5 minutes

  timeout?: NodeJS.Timeout;

  constructor(private client: Client) {}

  async run() {
    try {
      const domainList = await get(OPTIONS);

      await this.client.db.domains.bulkAdd(domainList);
      await this.client.metrics.updateDomainCount();
    } catch (e) {
      console.error('Unable to fetch domains:', e);
    }
  }

  async up() {
    try {
      await this.run();
      this.timeout = setInterval(this.run.bind(this), this.interval);
    } catch (e) {
      console.error('Error fetching domains:', e);

      if (this.failedAttempts++ >= this.attempts) {
        console.error(
          `DomainFetcher encountered ${this.failedAttempts} and has automatically shut down.`
        );

        this.down();
      }
    }
  }

  down() {
    if (this.timeout) {
      clearInterval(this.timeout);
      this.timeout = undefined;
    }
  }
}

function get(options: RequestOptions): Promise<string[]> {
  return new Promise((resolve, reject) => {
    try {
      request(options, res => {
        res.setEncoding('utf-8');
        res.setTimeout(10_000);

        let data = '';

        res
          .on('data', d => (data += d))
          .on('close', () => resolve(JSON.parse(data)))
          .on('end', () => resolve(JSON.parse(data)))
          .on('error', reject);
      })
        .on('error', reject)
        .end();
    } catch (e) {
      reject(e);
    }
  });
}
