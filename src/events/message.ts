import {Message} from 'discord.js';
import {DOMAIN_REGEX, Event} from 'fish';

// TODO: logger
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
        await msg.client.db.domains.hit(hitDomain);

        if (!(await msg.client.db.exemptions.isExempt(msg.member!))) {
          const guildConfig = await msg.client.db.guildConfigs.get(
            msg.guild!.id
          );

          try {
            if (guildConfig) {
              if (guildConfig.delete) {
                await msg.delete();
              }

              switch (guildConfig.action) {
                case 'NONE':
                  break;

                case 'BAN': {
                  if (msg.member!.bannable) {
                    await msg.member!.ban({
                      reason: `Posted a phishing URL: ${hitDomain}`,
                    });
                  }
                  break;
                }

                case 'SOFTBAN': {
                  if (msg.member!.bannable) {
                    try {
                      await msg.member!.ban({
                        reason: `[SOFTBAN] Posted a phishing URL: ${hitDomain}`,
                      });

                      await msg.guild!.members.unban(
                        msg.author.id,
                        `[SOFTBAN] Posted a phishing URL: ${hitDomain}`
                      );
                    } catch {
                      //
                    }
                  }
                  break;
                }

                case 'MUTE': {
                  if (!guildConfig.muteRole) {
                    return;
                  }

                  await msg.member!.roles.add(guildConfig.muteRole);
                  break;
                }

                case 'KICK': {
                  if (msg.member!.kickable) {
                    await msg.member!.kick(
                      `Posted a phishing URL: ${hitDomain}`
                    );
                  }

                  break;
                }
              }

              await this.client.logger.action(
                msg.guild!.id,
                msg.author,
                hitDomain
              );
            } else {
              // TODO
            }
          } catch (e) {
            await this.client.logger.error(msg.guild!.id, msg.author);
          }
        }
      }
    }
  }
}
