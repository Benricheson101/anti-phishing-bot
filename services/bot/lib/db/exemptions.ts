import {ExemptionKind, Exemptions, PrismaClient} from '@prisma/client';
import {GuildMember} from 'discord.js';

import {Database} from '.';
import {ExemptionState} from '../state/exemption';

export class ExemptionStore {
  constructor(
    private db: Database,
    private prisma: PrismaClient,
    private state: ExemptionState
  ) {}

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

      await this.state.set(exemption);

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
    await this.state.set(exemption);
    await this.state.setIsExempt(guild, id, true);

    return exemption;
  }

  async get(guild: string, id: string): Promise<Exemptions | null> {
    return (
      (await this.state.get(guild, id)) ||
      this.prisma.exemptions.findFirst({
        where: {
          id,
          guildId: guild,
        },
      })
    );
  }

  async delete(guild: string, id: string) {
    await this.state.del(guild, id);
    await this.state.setIsExempt(guild, id, false);

    return this.prisma.exemptions.delete({
      where: {
        id_guildId: {id, guildId: guild},
      },
    });
  }

  async isExempt(member: GuildMember): Promise<boolean> {
    const fromCache = await this.state.getIsExempt(
      member.guild.id,
      member.user.id
    );
    if (fromCache !== null) {
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

    await this.state.setIsExempt(member.guild.id, member.id, isExempt);
    if (isExempt) {
      await this.state.set({
        id: member.id,
        guildId: member.guild.id,
        kind: ExemptionKind.USER,
      });

      return true;
    }

    // TODO: redis transaction?
    const roleExemptionCache = await Promise.all(
      member.roles.cache.map(r => this.state.getIsExempt(member.guild.id, r.id))
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
      await this.state.setIsExempt(member.guild.id, role.id, isExemption);

      if (isExemption) {
        await this.state.set({
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
      await this.state.set(exemption);
      await this.state.setIsExempt(guild, exemption.id, true);
    }

    return all;
  }
}
