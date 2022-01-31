import {join} from 'path';
import {Client} from 'fish';
import './server';

new Client({
  cmdDir: join(__dirname, './cmds'),
  evtDir: join(__dirname, './events'),
  intents: ['GUILDS', 'GUILD_MESSAGES'],
  shardCount: Number(process.env.SHARD_COUNT) || undefined,
})
  .init()
  .then(client => client.login())
  .catch(console.error);
