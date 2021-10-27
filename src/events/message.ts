import {Message} from 'discord.js';
import {DOMAIN_REGEX, Event} from 'fish';

export class MessageCreateEvent extends Event {
  name = 'messageCreate';

  async run(msg: Message) {
    const {content, member} = msg;

    if (!member || msg.author.bot || msg.channel.type === 'DM') {
      return;
    }

    let matches;
    if (
      (matches = [...content.matchAll(DOMAIN_REGEX)].map(d => d[0])) &&
      matches.length
    ) {
      const toCheck = matches.map(d => msg.client.db.domains.exists(d));

      const checked = await Promise.all(toCheck);
      const trueAt = checked.indexOf(true);

      if (trueAt !== -1) {
        const hitDomain = matches[trueAt];

        this.client.metrics.addDomainHit(hitDomain);
        await this.client.db.domains.hit(hitDomain);

        if (!(await msg.client.db.exemptions.isExempt(msg.member!))) {
          const guildConfig = await msg.client.db.guildConfigs.get(
            msg.guild!.id
          );

          const actionsTaken: string[] = [];
          const actionsFailed: string[] = [];
          try {
            if (guildConfig) {
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
                    await msg.member!.kick(
                      `Posted a phishing URL: ${hitDomain}`
                    );
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
                msg.channel, //Assuming msg is a ChannelMessage object
                actionsTaken,
                actionsFailed
              );

              if (guildConfig.notify && actionsTaken.length) {
                await msg.member?.send({
                  content: `Phishing link detected in **${
                    msg.guild!.name
                  }**. Actions taken: ${actionsTaken
                    .map(a => `\`${a}\``)
                    .join(', ')}\n> \`${hitDomain}\``,
                });
              }
            } else {
              await msg.client.db.guildConfigs.add(msg.guild!.id);
            }
          } catch (e) {
            console.error(e);
          }
        }
      }
    }
  }
}
