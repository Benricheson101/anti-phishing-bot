import {Muted, PrismaClient} from '@prisma/client';
import {GuildMember} from 'discord.js';

export class MutedStore {
  constructor(private prisma: PrismaClient) {}

  async add(member: GuildMember): Promise<Muted> {
    return this.prisma.muted.create({
      data: {
        id: member.id,
        guild: {
          connectOrCreate: {
            where: { id: member.guild.id },
            create: { id: member.guild.id },
          },
        },
      },
    });
  }
  
  async get(guildId: string, id: string): Promise<Muted | null> {
    return this.prisma.exemptions.findUnique({
      where: { id_guildId: {id, guildId}},
    });
  }

  async delete(guildId: string, id: string) {
    return this.prisma.exemptions.delete({
      where: {
        id_guildId: {id, guildId},
      },
    });
  }
}
