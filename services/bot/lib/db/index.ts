import {PrismaClient} from '@prisma/client';

import {ExemptionStore} from './exemptions';
import {GuildConfigStore} from './guildConfigs';

export * from './exemptions';
export * from './guildConfigs';

export class Database {
  guildConfigs: GuildConfigStore;
  exemptions: ExemptionStore;

  checkMembersButtonState = new Map<string, string[]>();

  constructor(prisma: PrismaClient) {
    this.guildConfigs = new GuildConfigStore(prisma);
    this.exemptions = new ExemptionStore(this, prisma);
  }
}
