import {ExemptionKind, GuildConfigs} from '@prisma/client';
import {
  APIApplicationCommandOption,
  ApplicationCommandOptionType,
} from 'discord-api-types';
import {CommandInteraction, Permissions} from 'discord.js';
import ms, {StringValue} from 'ms';
import {Command} from 'fish';

const MAX_TIMEOUT_DURATION = ms('28d');

export class ConfigCommand extends Command {
  name = 'config';
  description = 'Configure how the bot works';
  options: APIApplicationCommandOption[] = [
    {
      name: 'get',
      description: 'Get the current server configuration',
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      // TODO: maybe use sub command groups?
      // TODO: unset command
      name: 'set',
      description: 'Configure how the bot works',
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
              name: 'Timeout',
              value: 'TIMEOUT',
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
        {
          name: 'notify',
          description: "Should users be DM'd when they are action'd",
          type: ApplicationCommandOptionType.Boolean,
        },
        {
          name: 'timeout_duration',
          description:
            'Sets the amount of time a user will be timed out when action is set to `TIMEOUT`',
          type: ApplicationCommandOptionType.String,
        },
      ],
    },
    {
      name: 'exemptions',
      description: 'Exempt users or roles from scam link detection',
      type: ApplicationCommandOptionType.SubcommandGroup,
      options: [
        {
          name: 'list',
          description: 'List all exemptions',
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: 'filter',
              description: 'Filter exemption list',
              type: ApplicationCommandOptionType.String,
              required: false,
              choices: [
                {
                  name: 'Role',
                  value: 'ROLE',
                },
                {
                  name: 'User',
                  value: 'USER',
                },
              ],
            },
          ],
        },
        {
          name: 'create',
          description: 'Create a new exemption',
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: 'kind',
              description: 'What kind of exemption to create',
              type: ApplicationCommandOptionType.String,
              required: true,
              choices: [
                {
                  name: 'Role',
                  value: 'ROLE',
                },
                {
                  name: 'User',
                  value: 'USER',
                },
              ],
            },
            {
              name: 'role',
              description: 'The role to exempt. Only usable when `kind: Role`',
              type: ApplicationCommandOptionType.Role,
            },
            {
              name: 'user',
              description: 'The user to exempt. Only usable when `kind: User`',
              type: ApplicationCommandOptionType.User,
            },
          ],
        },

        {
          name: 'remove',
          description: 'Delete an exemption',
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: 'kind',
              description: 'What kind of exemption to remove',
              type: ApplicationCommandOptionType.String,
              required: true,
              choices: [
                {
                  name: 'Role',
                  value: 'ROLE',
                },
                {
                  name: 'User',
                  value: 'USER',
                },
              ],
            },
            {
              name: 'role',
              description:
                'The exemption to remove. Only usable when `kind: Role`',
              type: ApplicationCommandOptionType.Role,
            },
            {
              name: 'user',
              description:
                'The exemption to remove. Only usable when `kind: User`',
              type: ApplicationCommandOptionType.User,
            },
          ],
        },
      ],
    },
    {
      name: 'reset',
      description: 'Reset parts of your configuration',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'reset_field',
          description: 'Which field to reset',
          type: ApplicationCommandOptionType.String,
          required: true,
          choices: [
            {
              name: 'delete',
              value: 'delete',
            },
            {
              name: 'action',
              value: 'action',
            },
            {
              name: 'log_channel',
              value: 'logChannel',
            },
            {
              name: 'mute_role',
              value: 'muteRole',
            },
            {
              name: 'timeout_duration',
              value: 'timeoutDuration',
            },
          ],
        },
      ],
    },
  ];

  async run(i: CommandInteraction) {
    if (!i.guild) {
      await i.reply({
        content: ':x: This command can only be used in servers.',
        ephemeral: true,
      });
      return;
    }

    if (
      !new Permissions(BigInt(i.member?.permissions as string)).has(
        'MANAGE_GUILD'
      )
    ) {
      await i.reply({
        content: ':x: You do not have permission to use this command',
        ephemeral: true,
      });

      return;
    }

    switch (i.options.getSubcommandGroup(false)) {
      case 'exemptions': {
        switch (i.options.getSubcommand(true)) {
          case 'list': {
            const filter = (i.options.getString('filter') || undefined) as
              | 'USER'
              | 'ROLE'
              | undefined;

            const exemptions = await i.client.db.exemptions.all(
              i.guild.id,
              filter
            );

            const _users = exemptions
              .filter(e => e.kind === 'USER')
              .map(e => `- ${e.id}`);
            const users = _users.join('\n');

            const _roles = exemptions
              .filter(e => e.kind === 'ROLE')
              .map(e => `- ${e.id}`);
            const roles = _roles.join('\n');

            const msg = `\`\`\`md
            => Total Exemptions: ${exemptions.length}

            -- Users (${_users.length}): --
            ${users || 'No Exempt Users'}

            -- Roles (${_roles.length}): --
            ${roles || 'No Exempt Roles'}
            \`\`\``
              .replace(/^ +/gm, '')
              .trim();

            await i.reply({content: msg, ephemeral: true});

            return;
          }

          case 'create': {
            const kind = i.options.getString('kind', true);
            const secondOp = i.options.get(kind.toLowerCase(), false);

            if (!secondOp) {
              await i.reply({
                content: `:x: You must provide a value to the \`${kind.toLowerCase()}\` parameter.`,
              });

              return;
            }

            const id = secondOp.value as string;

            try {
              await i.client.db.exemptions.add(
                i.guild.id,
                kind as ExemptionKind,
                id
              );

              await i.reply({
                content: `:white_check_mark: Created \`${kind}\` exemption for \`id=${id}\``,
                ephemeral: true,
              });
            } catch {
              await i.reply({
                content: ':x: This exemption already exists!',
                ephemeral: true,
              });
            }

            return;
          }

          case 'remove': {
            const kind = i.options.getString('kind', true);
            const secondOp = i.options.get(kind.toLowerCase(), false);

            if (!secondOp) {
              await i.reply({
                content: `:x: You must provide a value to the \`${kind.toLowerCase()}\` parameter.`,
              });

              return;
            }

            const id = secondOp.value as string;

            try {
              await i.client.db.exemptions.delete(i.guild.id, id);

              await i.reply({
                content: `:white_check_mark: Deleted \`${kind}\` exemption for \`id=${id}\``,
                ephemeral: true,
              });
            } catch {
              await i.reply({
                content: ':x: This exemption does not exist.',
                ephemeral: true,
              });
            }

            return;
          }
        }
        break;
      }

      default: {
        switch (i.options.getSubcommand()) {
          case 'get': {
            let guildConfig = await i.client.db.guildConfigs.get(i.guild.id);

            if (!guildConfig) {
              guildConfig = await i.client.db.guildConfigs.add(i.guild.id);
            }

            const msg = formatConfig(guildConfig);

            await i.reply({content: msg, ephemeral: true});
            return;
          }

          case 'set': {
            const data = i.options.data.find(
              p => p.name === 'set' && p.type === 'SUB_COMMAND'
            )!;

            if (!data.options?.length) {
              await i.reply({
                content:
                  ':x: Incorrect command usage. Please provide options to modify.',
                ephemeral: true,
              });

              return;
            }

            // TODO: this is awful
            const update: Record<string, string | number | BigInt | boolean> =
              {};
            for (const op of data.options || []) {
              if (op.name === 'log_channel') {
                op.name = 'logChannel';
              } else if (op.name === 'mute_role') {
                op.name = 'muteRole';
              }

              if (op.name === 'timeout_duration') {
                const val = ms(op.value! as StringValue);
                if (isNaN(val)) {
                  await i.reply({
                    content:
                      ':x: Invalid duration format. Example formats: `1d`, `30m`, `2 hours`',
                    ephemeral: true,
                  });

                  return;
                }

                if (val > MAX_TIMEOUT_DURATION) {
                  await i.reply({
                    content:
                      ':x: Supplied duration exceeds max timeout duration (28 days).',
                    ephemeral: true,
                  });

                  return;
                }

                if (val <= 0) {
                  await i.reply({
                    content: ':x: Timeout value must be greater than zero',
                    ephemeral: true,
                  });

                  return;
                }

                update['timeoutDuration'] = BigInt(val);
              } else {
                update[op.name as string] = op.value!;
              }
            }

            const updated = await i.client.db.guildConfigs.update(
              i.guild.id,
              update
            );

            const msg = formatConfig(updated);

            await i.reply({content: msg, ephemeral: true});
            return;
          }

          case 'reset': {
            const d = i.options.get('reset_field', true);

            const DEFAULTS: Record<string, string | BigInt | boolean | null> = {
              delete: true,
              action: 'NONE',
              muteRole: null,
              logChannel: null,
              timeoutDuration: 604800000n,
            };

            const field = d.value! as string;
            let val = DEFAULTS[field];

            await i.client.db.guildConfigs.update(i.guild.id, {
              [field]: val,
            });

            if (field === 'timeoutDuration') {
              val = ms(Number(val));
            }

            await i.reply({
              content: `:white_check_mark: Set \`${field}\` to the default value (\`${val}\`)`,
              ephemeral: true,
            });

            return;
          }
        }
      }
    }
  }
}

// TODO: find a better way to do this because this is painful
function formatConfig(config: GuildConfigs) {
  const cfg: Omit<GuildConfigs, 'timeoutDuration'> & {timeoutDuration: string} =
    {
      ...config,
      timeoutDuration: ms(Number(config.timeoutDuration)),
    };

  const entries = Object.entries(cfg);
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
