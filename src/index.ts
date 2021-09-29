import {join} from 'path';
import {Client} from 'fish';

new Client({
  cmdDir: join(__dirname, './cmds'),
  evtDir: join(__dirname, './events'),
  intents: ['GUILDS', 'GUILD_MESSAGES'],
})
  .init()
  .then(client => client.login())
  .catch(console.error);
