import type {RedisClientType} from 'redis';

import {CheckMembersButtonCached} from '../protos/caches_pb';

export type CheckMembersButtonStateValue = string[];

export class CheckMembersButtonState {
  constructor(private redis: RedisClientType) {}

  #cacheKey(msgID: string): string {
    return `check_member_button:${msgID}`;
  }

  async set(msgID: string, ids: CheckMembersButtonStateValue) {
    const val = new CheckMembersButtonCached();
    val.setMembersList(ids);

    const v = val.serializeBinary();

    return this.redis.set(this.#cacheKey(msgID), Buffer.from(v));
  }

  async get(msgID: string): Promise<CheckMembersButtonStateValue | null> {
    const fromRedis = await this.redis.get(this.#cacheKey(msgID));
    if (!fromRedis) {
      return null;
    }

    const buf = Buffer.from(fromRedis);
    const deser = CheckMembersButtonCached.deserializeBinary(buf);

    return deser.getMembersList();
  }
}
