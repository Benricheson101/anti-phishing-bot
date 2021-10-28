import {GuildMember} from 'discord.js';
import {Event} from 'fish';

export class Join extends Event {
  name = 'guildMemberAddc';

  async run(member: GuildMember) {
    if (this.client.db.muted.get(member.guild.id, member.id) !== null) {
      const muteRole = await this.client.db.guildConfigs
        .get(member.guild.id)
        .then(g => g?.muteRole);
      if (!muteRole) {
        return;
      }

      member.roles.add(muteRole, 'Sticky Mute: Phishing URLs');
    }
  }
}
