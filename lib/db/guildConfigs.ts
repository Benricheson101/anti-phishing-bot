import {GuildConfigs, PrismaClient} from '@prisma/client';

export class GuildConfigStore {
  constructor(private prisma: PrismaClient) {}

  async add(guild: string) {
    return this.prisma.guildConfigs.create({
      data: {
        id: guild,
      },
    });
  }

  async get(guild: string): Promise<GuildConfigs | null> {
    return this.prisma.guildConfigs.findFirst({where: {id: guild}});
  }

  async delete(guild: string) {
    return this.prisma.guildConfigs.delete({where: {id: guild}});
  }

  async update(guild: string, data: Partial<Omit<GuildConfigs, 'id'>>) {
    return this.prisma.guildConfigs.update({
      where: {id: guild},
      data,
    });
  }

  async exists(guild: string): Promise<boolean> {
    return this.prisma.guildConfigs
      .count({
        where: {id: guild},
      })
      .then(c => c > 0);
  }
}
