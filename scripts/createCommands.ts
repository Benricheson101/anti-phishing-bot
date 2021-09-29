import {Routes} from 'discord-api-types/v9';
import {REST} from '@discordjs/rest';
import {Client} from '../lib';

const TOKEN = process.env.DISCORD_TOKEN!;
const APP_ID = Buffer.from(TOKEN.split('.')[0], 'base64').toString();
const guild = process.env.GUILD;

(async () => {
  const client = new Client();
  await client.loadCommands();

  const cmds = client.cmds.map(c => c.toJSON());

  const rest = new REST().setToken(TOKEN);

  const endpoint = guild
    ? Routes.applicationGuildCommands(APP_ID, guild)
    : Routes.applicationCommands(APP_ID);

  const createdCommands = (await rest.put(endpoint, {body: cmds})) as {
    id: string;
    name: string;
  }[];

  console.log('--', createdCommands.length, 'Commands Created --');
  console.table(createdCommands.map(c => ({name: c.name, id: c.id})));
})();
