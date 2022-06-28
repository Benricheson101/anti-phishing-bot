import {CommandInteraction, Permissions, User} from 'discord.js';
import {
  MessageButtonStyles,
  MessageComponentTypes,
} from 'discord.js/typings/enums';

import {Command} from 'fish';

// TODO: move to redis?
// { 'guildID' => lastUsedAt }
const cooldowns = new Map<string, number>();
const COOLDOWN = 1_000 * 60; // 1 minute

export class CheckMembersCommand extends Command {
  name = 'check_members';
  description = 'Check if any members in the server are scam accounts';
  options = [];

  async run(i: CommandInteraction) {
    if (!i.inGuild() || !i.guild) {
      await i.reply({
        content: ':x: This command can only be used in servers',
        ephemeral: true,
      });

      return;
    }

    if (
      !i.memberPermissions?.any([
        Permissions.FLAGS.BAN_MEMBERS,
        Permissions.FLAGS.KICK_MEMBERS,
      ])
    ) {
      await i.reply({
        content: ':x: You do not have permission to use this command.',
        ephemeral: true,
      });

      return;
    }

    const lastUsedAt = cooldowns.get(i.guild.id);
    if (lastUsedAt && Date.now() - lastUsedAt <= COOLDOWN) {
      await i.reply({
        content: `:x: This command is on cooldown. Try again <t:${~~(
          (COOLDOWN + lastUsedAt) /
          1000
        )}:R>`,
        ephemeral: true,
      });

      return;
    }

    cooldowns.set(i.guild.id, Date.now());

    await i.deferReply({
      ephemeral: false,
    });

    const members = await i.guild.members.fetch({force: true});

    const found = await this.client.services.abusiveUserChecker.checkMembers(
      members.toJSON()
    );

    const abusive = [...found];

    if (!abusive.length) {
      await i.followUp({
        content: ':white_check_mark: No abusive users found!',
      });

      return;
    }

    let msg = `Found ${abusive.length} abusive member${
      abusive.length === 1 ? '' : 's'
    }:\n`;

    const fmtUser = (u: User) => `<@${u.id}> (**${u.tag}**, \`${u.id}\`)\n`;

    while (abusive.length && msg.length <= 1_800) {
      const user = abusive.shift();
      const fmtd = fmtUser(user!.user);

      if (msg.length + fmtd.length <= 1800) {
        msg += fmtd;
      }
    }

    if (abusive.length) {
      msg += `...and ${abusive.length} more`;
    }

    const m = await i.followUp({
      content: msg,
      components: [
        {
          type: MessageComponentTypes.ACTION_ROW,
          components: [
            {
              type: MessageComponentTypes.BUTTON,
              style: MessageButtonStyles.SUCCESS,
              label: 'User IDs',
              emoji: '📁',
              customId: 'check_members:SEND_IDS',
            },
            {
              type: MessageComponentTypes.BUTTON,
              style: MessageButtonStyles.PRIMARY,
              label: 'Ban',
              emoji: '⚒️',
              customId: 'check_members:BAN',
            },
            {
              type: MessageComponentTypes.BUTTON,
              style: MessageButtonStyles.PRIMARY,
              label: 'Soft Ban',
              emoji: '🔨',
              customId: 'check_members:SOFTBAN',
            },
            {
              type: MessageComponentTypes.BUTTON,
              style: MessageButtonStyles.PRIMARY,
              label: 'Kick',
              emoji: '👢',
              customId: 'check_members:KICK',
            },
          ],
        },
      ],
    });

    await this.client.state.checkMembersButton.set(
      m.id,
      abusive.map(m => m.user.id)
    );
  }
}
