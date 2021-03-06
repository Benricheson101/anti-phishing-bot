import {Options} from 'discord.js';
import {join} from 'path';

import {Client} from 'fish';

import './server';

new Client({
  cmdDir: join(__dirname, './cmds'),
  evtDir: join(__dirname, './events'),
  intents: ['GUILDS', 'GUILD_MESSAGES', 'GUILD_MEMBERS'],
  shardCount: Number(process.env.SHARD_COUNT) || undefined,
  makeCache: Options.cacheWithLimits({
    ApplicationCommandManager: 0,
    BaseGuildEmojiManager: 0,
    // TODO: how low can I make this without the bot failing to function?
    // GuildMemberManager: 10,
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
