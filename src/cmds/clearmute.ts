import {ApplicationCommandOptionType} from 'discord-api-types'
import {CommandInteraction} from 'discord.js'
import {Command} from 'fish'

export class ClearMuteCommand extends Command {
  name = 'clearmute';
  description = 'Clears a sticky (persistent) mute';
  options = [
    {
    name: 'member',
    description: 'Member who was muted by the bot',
    type: ApplicationCommandOptionType.User,
    required: true
    }
  ]

  async run (i: CommandInteraction) {
    const member = i.options.getUser('member', true);

    i.client.db.muted.delete(i.guildId!, member.id);
  }
}
