import {Client} from 'discord.js';
import {DomainFetcher} from '..';

export * from './domainFetcher';

export class ServiceManager {
  domainFetcher: DomainFetcher;

  constructor(client: Client) {
    // TODO: can this be run in its own thread?
    this.domainFetcher = new DomainFetcher(client.db);
    this.domainFetcher.up();
  }
}
