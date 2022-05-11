import {ActionKind, GuildConfigs} from '@prisma/client';
import {RedisClientType} from 'redis';

import {GuildConfigCached} from '../protos/caches_pb';

export class GuildConfigState {
  constructor(private redis: RedisClientType) {}

  #ttl = 60 * 60 * 24; // 24 hours

  #cacheKey(guildID: string): string {
    return `guild_config:${guildID}`;
  }

  async set(guildID: string, config: GuildConfigs) {
    const val = new GuildConfigCached();
    val.setDelete(config.delete);
    val.setPhishingAction(actionKindToProto(config.phishingAction));
    val.setAbusiveUserAction(actionKindToProto(config.abusiveUserAction));
    val.setTimeoutDuration(config.timeoutDuration.toString());

    config.logChannel && val.setLogChannel(config.logChannel);
    config.muteRole && val.setMuteRole(config.muteRole);
    config.notify !== null && val.setNotify(config.notify);

    const v = val.serializeBinary();

    return this.redis.setEx(this.#cacheKey(guildID), this.#ttl, Buffer.from(v));
  }

  async get(guildID: string): Promise<GuildConfigs | null> {
    const fromRedis = await this.redis.get(this.#cacheKey(guildID));
    if (!fromRedis) {
      return null;
    }

    const buf = Buffer.from(fromRedis);
    const deser = GuildConfigCached.deserializeBinary(buf);

    return {
      id: guildID,
      delete: deser.getDelete(),
      phishingAction: protoToActionKind(deser.getPhishingAction()),
      abusiveUserAction: protoToActionKind(deser.getAbusiveUserAction()),
      logChannel: deser.getLogChannel() || null,
      muteRole: deser.getMuteRole() || null,
      notify: deser.getNotify(),
      timeoutDuration: BigInt(deser.getTimeoutDuration()),
    };
  }

  async del(guildID: string) {
    return this.redis.del(this.#cacheKey(guildID));
  }

  async exists(guildID: string) {
    return this.redis.exists(this.#cacheKey(guildID)).then(r => !!r);
  }
}

const actionKindToProto = (k: ActionKind) => GuildConfigCached.ActionKind[k];

type ProtoActionKind = GuildConfigCached.ActionKindMap;
const protoToActionKind = (
  val: ProtoActionKind[keyof ProtoActionKind]
): ActionKind =>
  (Object.keys(GuildConfigCached.ActionKind) as (keyof ProtoActionKind)[]).find(
    k => GuildConfigCached.ActionKind[k] === val
  )! as ActionKind;
