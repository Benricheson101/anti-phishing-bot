import {Domains, PrismaClient} from '@prisma/client';

export class DomainStore {
  constructor(private prisma: PrismaClient) {}

  async add(domain: string) {
    return this.prisma.domains.create({data: {domain}});
  }

  async get(domain: string): Promise<Domains | null> {
    return this.prisma.domains.findFirst({where: {domain}});
  }

  async delete(domain: string) {
    return this.prisma.domains.delete({where: {domain}});
  }

  async exists(domain: string): Promise<boolean> {
    return this.prisma.domains.count({where: {domain}}).then(c => c > 0);
  }

  async update(domain: string, data: Partial<Domains>) {
    return this.prisma.domains.update({
      where: {domain},
      data,
    });
  }

  async hit(domain: string) {
    return this.prisma.domains.update({
      where: {domain},
      data: {
        hits: {
          increment: 1,
        },
      },
    });
  }

  async top(n: number) {
    return await this.prisma.domains
      .findMany({
        select: {
          domain: true,
          hits: true,
        },
        orderBy: {hits: 'asc'},
        where: {
          hits: {
            gt: 0,
          },
        },
      })
      .then(a => a.slice(0, n));
  }
}
