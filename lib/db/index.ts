import {PrismaClient} from '@prisma/client';
import {DomainStore} from './domains';
import {ExemptionStore} from './exemptions';
import {GuildConfigStore} from './guildConfigs';
import {MutedStore} from './muted';

export * from './domains';
export * from './exemptions';
export * from './guildConfigs';
export * from './muted';

// TODO: implement some sort of caching
export class Database {
  domains: DomainStore;
  guildConfigs: GuildConfigStore;
  exemptions: ExemptionStore;
  muted: MutedStore;

  constructor(prisma: PrismaClient) {
    this.domains = new DomainStore(prisma);
    this.guildConfigs = new GuildConfigStore(prisma);
    this.exemptions = new ExemptionStore(prisma);
    this.muted = new MutedStore(prisma);
  }
}
