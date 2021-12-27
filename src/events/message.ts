import {ActionKind} from '@prisma/client';
import {Message} from 'discord.js';
import {Event} from 'fish';

export class MessageCreateEvent extends Event {
  name = 'messageCreate';

  async run(msg: Message) {
    const {content, member} = msg;

    if (
      !member ||
      msg.author.bot ||
      msg.channel.type === 'DM' ||
      (await msg.client.db.exemptions.isExempt(msg.member!))
    ) {
      return;
    }

    const matches = await this.client.services.domainManager.test(content);

    if (!matches.length) {
      return;
    }

    for (const match of matches) {
      this.client.metrics.addDomainHit(match);
    }

    const hitDomain = matches[0];

    const guildConfig = await msg.client.db.guildConfigs.get(msg.guild!.id);

    const actionsTaken: string[] = [];
    const actionsFailed: string[] = [];
    try {
      if (guildConfig) {
        if (guildConfig.notify) {
          try {
            const actions: string[] = [];

            if (guildConfig.delete) {
              actions.push('DELETE');
            }

            if (guildConfig.action !== ActionKind.NONE) {
              actions.push(guildConfig.action);
            }

            await msg.member?.send({
              content: `Phishing link detected in **${
                msg.guild!.name
              }**. Actions taken: ${actions
                .map(a => `\`${a}\``)
                .join(', ')}\n> \`${hitDomain}\``,
            });
          } catch {
            //
          }
        }

        if (guildConfig.delete) {
          try {
            await msg.delete();
            actionsTaken.push('DELETE');
          } catch {
            actionsFailed.push('DELETE');
          }
        }

        switch (guildConfig.action) {
          case 'NONE':
            break;

          case 'BAN': {
            if (msg.member!.bannable) {
              await msg.member!.ban({
                reason: `Posted a phishing URL: ${hitDomain}`,
              });
              actionsTaken.push('BAN');
            } else {
              actionsFailed.push('BAN');
            }

            break;
          }

          case 'SOFTBAN': {
            if (msg.member!.bannable) {
              await msg.member!.ban({
                reason: `[SOFTBAN] Posted a phishing URL: ${hitDomain}`,
                days: 1,
              });

              await msg.guild!.members.unban(
                msg.author.id,
                `[SOFTBAN] Posted a phishing URL: ${hitDomain}`
              );

              actionsTaken.push('SOFTBAN');
            } else {
              actionsFailed.push('SOFTBAN');
            }

            break;
          }

          case 'MUTE': {
            if (!guildConfig.muteRole) {
              actionsFailed.push('MUTE');
              break;
            }

            try {
              await msg.member!.roles.add(guildConfig.muteRole);
              actionsTaken.push('MUTE');
            } catch {
              actionsFailed.push('MUTE');
            }
            break;
          }

          case 'KICK': {
            if (msg.member!.kickable) {
              await msg.member!.kick(`Posted a phishing URL: ${hitDomain}`);
              actionsTaken.push('KICK');
            } else {
              actionsFailed.push('KICK');
            }

            break;
          }
        }

        await this.client.logger.action(
          msg.guild!.id,
          msg.author,
          hitDomain,
          actionsTaken,
          actionsFailed
        );
      } else {
        await msg.client.db.guildConfigs.add(msg.guild!.id);
        // no config = create config & delete
        await msg.delete();
      }
    } catch (e) {
      console.error(e);
    }
  }
}
