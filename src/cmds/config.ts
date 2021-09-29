import {
  APIApplicationCommandOption,
  ApplicationCommandOptionType,
} from 'discord-api-types';
import {CommandInteraction} from 'discord.js';
import {Command} from 'fish';

export class ConfigCommand extends Command {
  name = 'config';
  description = 'Configure how the bot works';
  options: APIApplicationCommandOption[] = [
    {
      // TODO: maybe make this a subcommand group?
      name: 'set',
      description: 'Set a configuration option',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'delete',
          description: 'Should phishing messages be deleted?',
          type: ApplicationCommandOptionType.Boolean,
        },
        {
          name: 'action',
          description: 'What action should be taken?',
          type: ApplicationCommandOptionType.String,
          choices: [
            {
              name: 'Ban',
              value: 'BAN',
            },
            {
              name: 'Softban',
              value: 'SOFTBAN',
            },
            {
              name: 'Kick',
              value: 'KICK',
            },
            {
              name: 'Mute',
              value: 'MUTE',
            },
            {
              name: 'None',
              value: 'NONE',
            },
          ],
        },
        {
          name: 'log_channel',
          description: 'The channel where logs will be posted',
          type: ApplicationCommandOptionType.Channel,
        },
        {
          name: 'mute_role',
          description: 'The role to give users when `action` is set to `MUTE`',
          type: ApplicationCommandOptionType.Role,
        },
      ],
    },
  ];

  async run(i: CommandInteraction) {
    console.log(i.toJSON());
  }
}
