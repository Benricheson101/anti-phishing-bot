import {REST} from '@discordjs/rest';
import {Routes} from 'discord-api-types/v9';

const TOKEN = process.env.DISCORD_TOKEN!;
const APP_ID = Buffer.from(TOKEN.split('.')[0], 'base64').toString();
const guild = process.env.GUILD;

(async () => {
  const rest = new REST().setToken(TOKEN);

  const endpoint = guild
    ? Routes.applicationGuildCommands(APP_ID, guild)
    : Routes.applicationCommands(APP_ID);

  await rest.put(endpoint, {body: []});

  console.log('Deleted all commands');
})();
