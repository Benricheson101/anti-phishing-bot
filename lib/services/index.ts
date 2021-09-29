import {Client, DomainFetcher} from '..';

export * from './domainFetcher';

export class ServiceManager {
  domainFetcher: DomainFetcher;

  constructor(client: Client) {
    this.domainFetcher = new DomainFetcher(client.db);
    this.domainFetcher.up();
  }
}
