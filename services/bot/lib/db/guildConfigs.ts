import {GuildConfigs, PrismaClient} from '@prisma/client';

import {GuildConfigState} from '../state/guildConfig';

export class GuildConfigStore {
  constructor(private prisma: PrismaClient, readonly state: GuildConfigState) {}

  async add(guild: string) {
    const newConfig = await this.prisma.guildConfigs.create({
      data: {
        id: guild,
      },
    });

    await this.state.set(guild, newConfig);

    return newConfig;
  }

  async get(guild: string): Promise<GuildConfigs | null> {
    const fromCache = await this.state.get(guild);
    if (fromCache) {
      return fromCache;
    }

    const fromDB = await this.prisma.guildConfigs.findFirst({
      where: {id: guild},
    });

    if (fromDB) {
      await this.state.set(guild, fromDB);
    }

    return fromDB;
  }

  async getOrCreate(guild: string): Promise<GuildConfigs> {
    const conf = await this.get(guild);
    if (conf) {
      return conf;
    }

    return this.add(guild);
  }

  async delete(guild: string) {
    await this.state.del(guild);
    return this.prisma.guildConfigs.delete({where: {id: guild}});
  }

  async update(guild: string, data: Partial<Omit<GuildConfigs, 'id'>>) {
    const updated = await this.prisma.guildConfigs.upsert({
      where: {id: guild},
      update: data,
      create: {
        id: guild,
        ...data,
      },
    });

    await this.state.set(guild, updated);

    return updated;
  }

  async exists(guild: string): Promise<boolean> {
    return (
      (await this.state.exists(guild)) ||
      this.prisma.guildConfigs
        .count({
          where: {id: guild},
        })
        .then(c => c > 0)
    );
  }
}
