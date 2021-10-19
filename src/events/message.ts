import {Message, TextChannel} from 'discord.js';
import {DOMAIN_REGEX, Event} from 'fish';

// TODO: logger
export class MessageCreateEvent extends Event {
  name = 'messageCreate';

  async run(msg: Message) {
    const {content, member} = msg;
    if (!member || msg.author.bot || !msg.guild) { return; }
   
    const channel = msg.channel as TextChannel;
    
    let matches = [...content.matchAll(DOMAIN_REGEX)].map(d => d[0]);
    if (!matches || !matches.length) { return; }

    const hits = await this.client.db.domains.check(matches);
    if (!hits || !hits.length) { return; }

    const config = await this.client.db.guildConfigs.get(msg.guildId!);
    if (!config) { 
      this.client.db.guildConfigs.add(msg.guildId!)  
      return; 
    }

    const actionsTaken: string[] = []
    const actionsFailed: string[] = []

    const exemption = await this.client.db.exemptions.checkExempt(msg);

    let dm;
    let res;
    let note = hits.reduce((t,d) => `${t}\n\`${d}\``,
      `You have posted a known **Phishing** link in #${channel.name} on ${msg.guild.name}\n\nDOMAIN/S:`);

    try {
      switch (config.notify) {
        case 'ALWAYS': {
          dm = await member.createDM();
          res = await dm.send(note);
          dm.sendTyping();
          break;
        }

        case 'YES': {
          if (!exemption) {
            dm = await member.createDM();
            res = await dm.send(note);
            dm.sendTyping();
          }
        break;
        }
      }
    } catch (e) {
      actionsFailed.push('NOTIFY');
      // console.error(e);
    }

    try {
      switch (config.delete)
      {
        case 'ALWAYS': {
          if (exemption !== 'CHANNEL') {
            if (!msg.deletable) {
              actionsFailed.push('DELETE');
              break;
            }
            await msg.delete();
            actionsTaken.push('DELETE');
          }
          break;
        }

        case 'YES': {
          if (!exemption) {
            if (!msg.deletable) {
              actionsFailed.push('DELETE');
              break;
            }
            await msg.delete();
            actionsTaken.push('DELETE');
          }
          break;
        }
      }
    } catch (e) {
      actionsFailed.push('DELETE');
      // console.error(e);
    }
    if (!exemption) {
      try {
        switch (config.action) {
          case 'MUTE': {
            if (!config.muteRole) {
              actionsFailed.push('MUTE');
              break;
            }
            await member.roles.add (config.muteRole, 
              `Anti-Phishing Protection URL: ${hits[0]}`);
            actionsTaken.push('MUTE');
            break;
          }

          case 'STICKYMUTE': {
            if (!config.muteRole) {
              actionsFailed.push('STICKYMUTE');
              break;
            }
            await member.roles.add ( config.muteRole,
              `Anti-Phishing Protection URL: ${hits[0]}`);
            await this.client.db.muted.add(member);
            actionsTaken.push('STICKYMUTE')
            break;
          }

          case 'KICK': {
            if (!member.kickable) {
              actionsFailed.push('KICK');
              break;
            }
            await member.kick(`Anti-Phishing Protection URL: ${hits[0]}`);
            actionsTaken.push('KICK');
            break;
          }

          case 'SOFTBAN': {
            if (!member.bannable) {
              actionsTaken.push('SOFTBAN');
              break;
            }
            await member.ban({ 
              reason: `[SOFTBAN] Anti-Phishing Protection URL: ${hits[0]}` 
            });
            await new Promise (r => {
              setTimeout (()=>{
                r (msg.guild!.members.unban(member.id,
                  `[SOFTBAN] Anti-Phishing Protection URL: ${hits[0]}`
                ));
              },5000);
            });
            actionsTaken.push('SOFTBAN')
            break;
          }

          case 'BAN': {
            if (!member.bannable) {
              actionsFailed.push('BAN');
              break;
            }
            await member.ban({
              reason: `Anti-Phishing Protection URL: ${hits[0]}`
            });
            actionsTaken.push('BAN');
            break;
          }
        }
      } catch (e) {
        actionsFailed.push(config.action);
        console.error(e);
      }
    }
    
    if (actionsTaken.length && dm && res) {
      await res.edit(
        actionsTaken.reduce((t,a)=>`${t}\n\`${a}\``,
          `${note}\n\nACTION/S:`)
      )
        .then(()=>actionsTaken.unshift('NOTIFY'))
        .catch((e)=>{
          actionsFailed.unshift('NOTIFY');
          // console.error (e);
        });
    }

    if ((actionsFailed.length || config.logLevel === 'ALWAYS') && !actionsTaken.length) {
      actionsTaken.push('NONE');
    }

    if ( config.logLevel !== 'NO' && config.logChannel && 
        ( actionsTaken.length || actionsFailed.length )) {
      this.client.logger.action(msg, config, hits, actionsTaken, actionsFailed)
        .catch(console.error)
    }
  }
}
