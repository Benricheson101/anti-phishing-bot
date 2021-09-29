import {Database, DomainFetcher} from '..';

export * from './domainFetcher';

export class ServiceManager {
  domainFetcher: DomainFetcher;

  constructor(db: Database) {
    this.domainFetcher = new DomainFetcher(db);
    this.domainFetcher.up();
  }
}
