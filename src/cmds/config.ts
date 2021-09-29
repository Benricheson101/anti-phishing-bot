import {GuildConfigs} from '@prisma/client';
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
  ];

  async run(i: CommandInteraction) {
    if (!i.guild) {
      return;
    }

    if (!i.options.data.length) {
      let guildConfig = await i.client.db.guildConfigs.get(i.guild.id);

      if (!guildConfig) {
        guildConfig = await i.client.db.guildConfigs.add(i.guild.id);
      }

      const msg = formatConfig(guildConfig);

      await i.reply({content: msg, ephemeral: true});
      return;
    }

    // TODO: a way to reset config stuff
    const update: Record<string, string | number | boolean> = {};
    for (const op of i.options.data) {
      if (op.name === 'log_channel') {
        op.name = 'logChannel';
      } else if (op.name === 'mute_role') {
        op.name = 'muteRole';
      }

      update[op.name as string] = op.value!;
    }

    const updated = await i.client.db.guildConfigs.update(i.guild.id, update);

    const msg = formatConfig(updated);

    await i.reply({content: msg, ephemeral: true});
  }
}

function formatConfig(config: GuildConfigs) {
  const entries = Object.entries(config);
  const longest = Math.max(...entries.map(([k]) => k.length));

  return `\`\`\`ini
      ${entries
        .map(
          ([k, v]) =>
            `${k.padEnd(longest)} = ${typeof v === 'string' ? `'${v}'` : v}`
        )
        .join('\n')}
      \`\`\``
    .replace(/^ +/gm, '')
    .trim();
}
