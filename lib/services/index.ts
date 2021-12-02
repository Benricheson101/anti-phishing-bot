import {Client, DomainManager} from '..';

export * from './domainFetcher';

export class ServiceManager {
  domainManager: DomainManager;

  constructor(client: Client) {
    this.domainManager = new DomainManager(client);
    this.domainManager.up();
  }
}
