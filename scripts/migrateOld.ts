import {PrismaClient} from '@prisma/client';
import {existsSync} from 'fs';
import {join} from 'path';

const prisma = new PrismaClient();

(async () => {
  const argv = process.argv.slice(2);

  let jsonFile = argv[0];

  if (!argv) {
    throw new Error('Missing JSON file argument');
  }

  if (!existsSync(jsonFile)) {
    throw new Error('Specified file does not exist.');
  }

  jsonFile = join(process.cwd(), jsonFile);

  const json = require(jsonFile) as OldDb[];

  const transaction = await prisma.$transaction(
    json.map(d =>
      prisma.domains.create({
        data: {
          domain: d.url,
          hits: d.hits,
          createdAt: new Date(d.added_at),
        },
      })
    )
  );

  console.log(`Created ${transaction.length} domains.`);
})().finally(() => prisma.$disconnect());

interface OldDb {
  id: number;
  url: string;
  hits: number;
  added_at: string;
}
