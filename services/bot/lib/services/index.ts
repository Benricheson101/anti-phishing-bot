import {Client, DomainManager} from '..';
import {AbusiveUserChecker} from './abusiveUserChecker';

export * from './domainFetcher';

export class ServiceManager {
  domainManager: DomainManager;
  abusiveUserChecker: AbusiveUserChecker;

  constructor(client: Client) {
    this.domainManager = new DomainManager(client);
    this.abusiveUserChecker = new AbusiveUserChecker();

    this.domainManager.up();
  }
}
