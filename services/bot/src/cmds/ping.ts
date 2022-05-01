import {CommandInteraction} from 'discord.js';

import {Command} from 'fish';

export class PingCommand extends Command {
  name = 'ping';
  description = 'Pong!';
  options = [];

  async run(i: CommandInteraction) {
    await i.reply({content: 'Pong!', ephemeral: true});
  }
}
