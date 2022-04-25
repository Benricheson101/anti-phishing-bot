import {CommandInteraction} from 'discord.js';
import {Command} from 'fish';

export class SupportCommand extends Command {
  name = 'support';
  description = "Get a link to the bot's support server";
  options = [];

  async run(i: CommandInteraction) {
    await i.reply({
      content: process.env.SUPPORT_INVITE!,
      ephemeral: true,
    });
  }
}
