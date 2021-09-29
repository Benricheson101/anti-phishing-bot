import {Database, DomainFetcher} from '..';

export * from './domainFetcher';

export class ServiceManager {
  domainFetcher: DomainFetcher;

  constructor(db: Database) {
    // TODO: can this be run in its own thread?
    this.domainFetcher = new DomainFetcher(db);
    this.domainFetcher.up();
  }
}
