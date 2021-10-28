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

  async check(domains: string[]): Promise<string[]> {
    const matches = await this.prisma.domains
      .findMany({where: {domain: {in: domains}}})
      .then(r => r.map(d => d.domain));
    this.prisma.domains.updateMany({
      where: {domain: {in: domains}},
      data: {hits: {increment: 1}},
    });
    return matches;
  }

  async update(domain: string, data: Partial<Domains>) {
    return this.prisma.domains.update({
      where: {domain},
      data,
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
