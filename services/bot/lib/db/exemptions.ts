import {ExemptionKind, Exemptions, PrismaClient} from '@prisma/client';
import {GuildMember} from 'discord.js';

import {Database} from '.';

export class ExemptionStore {
  cache: Map<string, Exemptions | null> = new Map();
  isExemptCache: Map<string, boolean> = new Map();

  constructor(private db: Database, private prisma: PrismaClient) {}

  async add(guild: string, kind: ExemptionKind, id: string) {
    const guildExists = await this.db.guildConfigs.exists(guild);

    if (guildExists) {
      const exemption = await this.prisma.exemptions.create({
        data: {
          id,
          kind,
          guildId: guild,
        },
      });

      this.cache.set(`${guild}-${id}`, exemption);

      return exemption;
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

    const exemption = created.exemptions[0];
    await this.db.guildConfigs.state.set(guild, created);
    this.cache.set(`${guild}-${id}`, exemption);
    this.isExemptCache.set(`${guild}-${id}`, true);

    return exemption;
  }

  async get(guild: string, id: string): Promise<Exemptions | null> {
    return (
      this.cache.get(`${guild}-${id}`) ||
      this.prisma.exemptions.findFirst({
        where: {
          id,
          guildId: guild,
        },
      })
    );
  }

  async delete(guild: string, id: string) {
    this.cache.delete(`${guild}-${id}`);
    this.isExemptCache.set(`${guild}-${id}`, false);

    return this.prisma.exemptions.delete({
      where: {
        id_guildId: {id, guildId: guild},
      },
    });
  }

  async isExempt(member: GuildMember): Promise<boolean> {
    const fromCache = this.isExemptCache.get(
      `${member.guild.id}-${member.user.id}`
    );
    if (fromCache !== undefined) {
      return fromCache;
    }

    const isExempt = await this.prisma.exemptions
      .count({
        where: {
          kind: ExemptionKind.USER,
          id: member.user.id,
          guildId: member.guild.id,
        },
      })
      .then(c => c > 0);

    this.isExemptCache.set(`${member.guild.id}-${member.id}`, isExempt);
    if (isExempt) {
      this.cache.set(`${member.guild.id}-${member.id}`, {
        id: member.id,
        guildId: member.guild.id,
        kind: ExemptionKind.USER,
      });

      return true;
    }

    const roleExemptionCache = member.roles.cache.map(r =>
      this.isExemptCache.get(`${member.guild.id}-${r.id}`)
    );
    if (roleExemptionCache.some(r => !!r)) {
      return true;
    }

    // if the exemption status of all of a users roles is cached,
    // don't bother checking the database
    if (!roleExemptionCache.filter(r => r === undefined).length) {
      if (roleExemptionCache.every(r => r === false)) {
        return false;
      }
    }

    const roleExemptions = await this.prisma.exemptions.findMany({
      select: {id: true},
      where: {guildId: member.guild.id, kind: ExemptionKind.ROLE},
    });

    for (const role of member.roles.cache.toJSON()) {
      const isExemption = roleExemptions.some(r => r.id === role.id);
      this.isExemptCache.set(`${member.guild.id}-${role.id}`, isExemption);

      if (isExemption) {
        this.cache.set(`${member.guild.id}-${role.id}`, {
          id: role.id,
          guildId: member.guild.id,
          kind: ExemptionKind.ROLE,
        });
      }
    }

    return member.roles.cache.hasAny(...roleExemptions.map(r => r.id));
  }

  async all(guild: string, filter?: 'USER' | 'ROLE') {
    const all = await this.prisma.exemptions.findMany({
      where: {
        guildId: guild,
        kind: filter,
      },
    });

    for (const exemption of all) {
      this.cache.set(`${guild}-${exemption.id}`, exemption);
      this.isExemptCache.set(`${guild}-${exemption.id}`, true);
    }

    return all;
  }
}
