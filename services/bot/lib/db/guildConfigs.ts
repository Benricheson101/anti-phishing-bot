import {GuildConfigs, PrismaClient} from '@prisma/client';

export class GuildConfigStore {
  cache: Map<string, GuildConfigs> = new Map();

  constructor(private prisma: PrismaClient) {}

  async add(guild: string) {
    const newConfig = await this.prisma.guildConfigs.create({
      data: {
        id: guild,
      },
    });

    this.cache.set(guild, newConfig);

    return newConfig;
  }

  async get(guild: string): Promise<GuildConfigs | null> {
    const fromCache = this.cache.get(guild);
    if (fromCache) {
      return fromCache;
    }

    const fromDB = await this.prisma.guildConfigs.findFirst({
      where: {id: guild},
    });

    if (fromDB) {
      this.cache.set(guild, fromDB);
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
    this.cache.delete(guild);
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

    this.cache.set(guild, updated);

    return updated;
  }

  async exists(guild: string): Promise<boolean> {
    return (
      this.cache.has(guild) ||
      this.prisma.guildConfigs
        .count({
          where: {id: guild},
        })
        .then(c => c > 0)
    );
  }
}
