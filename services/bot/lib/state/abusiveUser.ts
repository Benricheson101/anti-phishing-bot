import {GuildMember} from 'discord.js';
import {RedisClientType} from 'redis';

import {CheckedUserCached} from '../protos/caches_pb';
import {CheckedUser} from '../services/abusiveUserChecker';

export class AbusiveUserState {
  #ttl = 60 * 60 * 24; // 24 hours

  constructor(private redis: RedisClientType) {}

  #cacheKey(m: GuildMember): string {
    return `abusive_user:${m.user.id}:${m.user.username}:${m.user.avatar}`;
  }

  async set(m: GuildMember, verdict: CheckedUser) {
    const v = new CheckedUserCached();
    v.setMatchedUsername(verdict.matchedUsername);
    v.setMatchedAvatar(verdict.matchedAvatar);
    v.setNearestAvatar(verdict.nearestAvatar);

    const u = new CheckedUserCached.BasicDiscordUser();
    u.setId(m.user.id);
    u.setUsername(m.user.username);
    u.setDiscriminator(m.user.discriminator);
    // TODO: is there a better way to make this nullable
    u.setAvatar(m.user.avatar || '');

    v.setUser(u);

    const ser = v.serializeBinary();

    return this.redis.setEx(this.#cacheKey(m), this.#ttl, Buffer.from(ser));
  }

  async get(m: GuildMember): Promise<CheckedUserCached | null> {
    const fromRedis = await this.redis.get(this.#cacheKey(m));
    if (!fromRedis) {
      return null;
    }

    const buf = Buffer.from(fromRedis);
    const deser = CheckedUserCached.deserializeBinary(buf);

    return deser;
  }
}
