import {Domains, PrismaClient} from '@prisma/client';

export class DomainStore {
  constructor(private prisma: PrismaClient) {}

  async add(domain: string) {
    return this.prisma.domains.create({data: {domain}});
  }

  async bulkAdd(domains: string[]) {
    if (!domains?.length) {
      return;
    }

    return this.prisma.domains.createMany({
      data: domains.map(d => ({domain: d})),
      skipDuplicates: true,
    });
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
    return this.prisma.domains
      .findMany({
        orderBy: {hits: 'desc'},
        where: {
          hits: {
            gt: 0,
          },
        },
      })
      .then(a => a.slice(0, n));
  }

  async count(): Promise<number> {
    return this.prisma.domains.count();
  }

  async totalHits(): Promise<number> {
    return this.prisma.domains
      .aggregate({_sum: {hits: true}})
      .then(s => s._sum.hits || 0);
  }
}
