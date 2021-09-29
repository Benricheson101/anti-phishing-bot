import {ExemptionKind, Exemptions, PrismaClient} from '@prisma/client';
import {GuildMember} from 'discord.js';

export class ExemptionStore {
  constructor(private prisma: PrismaClient) {}

  async add(guild: string, kind: ExemptionKind, id: string) {
    const guildExists = await this.prisma.guildConfigs
      .count({
        where: {id: guild},
      })
      .then(c => c > 0);

    if (guildExists) {
      return this.prisma.exemptions.create({
        data: {
          id,
          kind,
          guildId: guild,
        },
      });
    }

    const created = await this.prisma.guildConfigs.create({
      data: {
        id: guild,
        exemptions: {
          create: {
            id,
            kind,
          },
        },
      },
      include: {exemptions: true},
    });

    return created.exemptions[0];
  }

  async get(guild: string, id: string): Promise<Exemptions | null> {
    return this.prisma.exemptions.findFirst({
      where: {
        id,
        guildId: guild,
      },
    });
  }

  async delete(guild: string, id: string) {
    return this.prisma.exemptions.delete({
      where: {
        id_guildId: {id, guildId: guild},
      },
    });
  }

  async isExempt(member: GuildMember): Promise<boolean> {
    const isExempt = await this.prisma.exemptions
      .count({
        where: {
          kind: ExemptionKind.USER,
          id: member.user.id,
          guildId: member.guild.id,
        },
      })
      .then(c => c > 0);

    if (isExempt) {
      return true;
    }

    const guildRoles = await this.prisma.exemptions.findMany({
      select: {id: true},
      where: {guildId: member.guild.id, kind: ExemptionKind.ROLE},
    });

    return member.roles.cache.hasAny(...guildRoles.map(r => r.id));
  }
}
