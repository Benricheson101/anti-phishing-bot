import './server';

import {join} from 'path';
import {Options} from 'discord.js';
import {Client} from 'fish';

new Client({
  cmdDir: join(__dirname, './cmds'),
  evtDir: join(__dirname, './events'),
  intents: ['GUILDS', 'GUILD_MESSAGES'],
  makeCache: Options.cacheWithLimits({
    ApplicationCommandManager: 0,
    BaseGuildEmojiManager: 0,
    // TODO: could this cause a race condition?
    GuildMemberManager: 10,
    GuildBanManager: 0,
    GuildInviteManager: 0,
    GuildStickerManager: 0,
    MessageManager: 0,
    PresenceManager: 0,
    ReactionManager: 0,
    ReactionUserManager: 0,
    StageInstanceManager: 0,
    ThreadManager: 0,
    ThreadMemberManager: 0,
    UserManager: 0,
    VoiceStateManager: 0,
  }),
})
  .init()
  .then(client => client.login())
  .catch(console.error);
