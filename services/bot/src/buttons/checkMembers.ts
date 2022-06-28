import {ButtonInteraction, MessageAttachment, Permissions} from 'discord.js';
import {
  MessageButtonStyles,
  MessageComponentTypes,
} from 'discord.js/typings/enums';

import {Client} from 'fish';

export const handleCheckMembersButton = async (
  client: Client,
  i: ButtonInteraction
) => {
  if (
    !i.memberPermissions?.any([
      Permissions.FLAGS.BAN_MEMBERS,
      Permissions.FLAGS.KICK_MEMBERS,
    ])
  ) {
    await i.reply({
      content: ':x: You do not have permission to use this menu.',
      ephemeral: true,
    });

    return;
  }

  const [, action] = i.customId.split(':');

  const users = await client.state.checkMembersButton.get(i.message.id);

  const clearButtons = () =>
    i.update({
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
          ],
        },
      ],
    });

  if (!users || !users.length) {
    await i.followUp({
      content:
        ':x: Unable to find users to action. Try rerunning the command and pressing the button again.',
    });

    return;
  }

  switch (action) {
    case 'SEND_IDS': {
      const file = new MessageAttachment(
        Buffer.from(users.join('\n')),
        'users.txt'
      );

      await i.reply({
        files: [file],
      });

      return;
    }

    // TODO: merge BAN and SOFTBAN into one block
    case 'BAN': {
      if (!i.memberPermissions.has(Permissions.FLAGS.BAN_MEMBERS)) {
        await i.reply({
          content: ':x: You do not have permission to use this command',
          ephemeral: true,
        });

        return;
      }

      if (!i.guild?.me?.permissions.has(Permissions.FLAGS.BAN_MEMBERS)) {
        await i.reply({
          content: ':x: I do not have ban permissions in this server',
          ephemeral: true,
        });

        return;
      }

      await clearButtons();

      let successfulBans = 0;
      for (const user of users) {
        try {
          await i.guild?.bans.create(user, {
            reason: `Abusive user detected via manual member check (invoked by ${i.user.tag})`,
          });

          successfulBans++;
        } catch {
          //
        }
      }

      await i.followUp({
        content: `:white_check_mark: Banned ${successfulBans}/${users.length} abusive users.`,
      });

      return;
    }

    case 'SOFTBAN': {
      if (!i.memberPermissions.has(Permissions.FLAGS.BAN_MEMBERS)) {
        await i.reply({
          content: ':x: You do not have permission to use this command',
          ephemeral: true,
        });

        return;
      }

      if (!i.guild?.me?.permissions.has(Permissions.FLAGS.BAN_MEMBERS)) {
        await i.reply({
          content: ':x: I do not have ban permissions in this server',
          ephemeral: true,
        });

        return;
      }

      await clearButtons();

      let successfulBans = 0;
      for (const user of users) {
        try {
          await i.guild?.bans.create(user, {
            reason: `[SOFTBAN] Abusive user detected via manual member check (invoked by ${i.user.tag})`,
            days: 1,
          });

          await i.guild?.bans.remove(
            user,
            `[SOFTBAN] Abusive user detected via manual member check (invoked by ${i.user.tag})`
          );

          successfulBans++;
        } catch {
          //
        }
      }

      await i.followUp({
        content: `:white_check_mark: Soft banned ${successfulBans}/${users.length} abusive users.`,
      });

      return;
    }

    case 'KICK': {
      if (!i.memberPermissions.has(Permissions.FLAGS.KICK_MEMBERS)) {
        await i.reply({
          content: ':x: You do not have permission to use this command',
          ephemeral: true,
        });

        return;
      }

      if (!i.guild?.me?.permissions.has(Permissions.FLAGS.KICK_MEMBERS)) {
        await i.reply({
          content: ':x: I do not have kick permissions in this server',
          ephemeral: true,
        });

        return;
      }

      await clearButtons();

      let successfulKicks = 0;
      for (const user of users) {
        try {
          await i.guild?.members.kick(
            user,
            `[SOFTBAN] Abusive user detected via manual member check (invoked by ${i.user.tag})`
          );

          successfulKicks++;
        } catch {
          //
        }
      }

      await i.followUp({
        content: `:white_check_mark: Kicked ${successfulKicks}/${users.length} abusive users.`,
      });

      return;
    }
  }
};
