import {PrismaClient} from '@prisma/client';

import {State} from '../state';
import {ExemptionStore} from './exemptions';
import {GuildConfigStore} from './guildConfigs';

export * from './exemptions';
export * from './guildConfigs';

export class Database {
  guildConfigs: GuildConfigStore;
  exemptions: ExemptionStore;

  constructor(prisma: PrismaClient, state: State) {
    this.guildConfigs = new GuildConfigStore(prisma, state.guildConfig);
    this.exemptions = new ExemptionStore(this, prisma);
  }
}
