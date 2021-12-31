import {Client} from './client';
import {collectDefaultMetrics, Gauge} from 'prom-client';

export class Metrics {
  readonly domainHits = new Gauge({
    name: 'domain_hits',
    help: 'increments when a malicious domain is seen',
    labelNames: ['domain', 'was_redirect'],
  });

  readonly guildCount = new Gauge({
    name: 'guild_count',
    help: 'the number of servers the bot is in',
  });

  readonly domainCount = new Gauge({
    name: 'domain_count',
    help: 'the number of malicious domains the bot knows about',
    labelNames: ['source'],
  });

  readonly shortenerCount = new Gauge({
    name: 'shortener_count',
    help: 'the number of url shorteners supported',
  });

  readonly commandUsed = new Gauge({
    name: 'commands_used',
    help: 'the number of commands used',
    labelNames: ['command', 'success'],
  });

  readonly gatewayPing = new Gauge({
    name: 'gateway_ping',
    help: "ms ping to discord's gateway",
  });

  readonly domainFetches = new Gauge({
    name: 'domain_fetches',
    help: 'increments when domains are fetched',
    labelNames: ['count', 'success'],
  });

  readonly gatewayEvents = new Gauge({
    name: 'gateway_events',
    help: 'events received over the Discord gateway',
    labelNames: ['event'],
  });

  constructor(private client: Client) {
    collectDefaultMetrics();
  }

  addCommandUsage(command: string, success: boolean) {
    this.commandUsed.labels(command, String(success)).inc();
  }

  addDomainHit(domain: string, wasRedirect = false) {
    this.domainHits.inc({domain, was_redirect: String(wasRedirect)});
  }

  updateDomainCount(count: number, source: 'phish_api' | 'discord' | '' = '') {
    this.domainCount.set({source}, count);
  }

  updateShortenerCount(count: number) {
    this.shortenerCount.set(count);
  }

  updateGuildCount() {
    this.guildCount.set(this.client.guilds.cache.size);
  }

  updateGatewayPing() {
    this.gatewayPing.set(this.client.ws.ping);
  }

  domainsFetched(success: boolean, n?: number) {
    this.domainFetches.inc({success: String(success), count: n});
  }

  addGatewayEvent(event: string) {
    this.gatewayEvents.inc({event});
  }
}
