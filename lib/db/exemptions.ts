import {ExemptionKind, Exemptions, PrismaClient} from '@prisma/client';
import {Message} from 'discord.js';

export class ExemptionStore {
  constructor(private prisma: PrismaClient) {}

  async add(guild: string, kind: ExemptionKind, id: string): Promise<Exemptions> {
    return this.prisma.exemptions.create({
      data: {
        id,
        kind,
        guild: {
          connectOrCreate: {
            where: { id: guild },
            create: { id: guild },
          },
        },
      },
    });
  }
  
  async get(guildId: string, id: string): Promise<Exemptions | null> {
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
  
  async checkExempt(message: Message): Promise<ExemptionKind | false> {
    return (await this.prisma.exemptions.findFirst({
      where: {
        AND: [ { 
          guildId: message.guildId! },
          { 
            id: { 
              in: [ 
                message.channelId, 
                message.author.id, 
                ...message.member!.roles.cache.keys() ],
            }
          }
        ],
      },
      orderBy: {kind: 'asc'},
      select:  {kind: true },
    }))?.kind || false;
  }
}
