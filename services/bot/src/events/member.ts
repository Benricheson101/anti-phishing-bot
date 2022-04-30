import {ActionKind} from '@prisma/client';
import {GuildMember} from 'discord.js';
import {ClientEventNames, Event, doAction, Client} from 'fish';

export class MemberJoinEvent extends Event {
  name: ClientEventNames = 'guildMemberAdd';

  async run(m: GuildMember) {
    await run(this.client, m);
  }
}

export class MemberUpdateEvent extends Event {
  name: ClientEventNames = 'guildMemberUpdate';

  async run(oldMember: GuildMember, newMember: GuildMember) {
    const changedUsername = oldMember.user.username !== newMember.user.username;
    const changedAvatar = oldMember.user.avatar !== newMember.user.avatar;

    // The only time we care about the event is when username/av changes.
    // Any other modifications can be ignored
    if (!(changedAvatar || changedUsername)) {
      return;
    }

    await run(this.client, newMember);
  }
}

const run = async (client: Client, member: GuildMember) => {
  const config = await client.db.guildConfigs.getOrCreate(member.guild.id);

  if (config.abusiveUserAction === ActionKind.NONE) {
    return;
  }

  const checked = await client.services.abusiveUserChecker.checkMember(member);

  if (!(checked.matchedUsername && checked.matchedAvatar)) {
    return;
  }

  const success = await doAction(member, config);

  await client.logger.abusiveUserAction(
    member.guild.id,
    member.user,
    config.abusiveUserAction,
    success
  );
};
