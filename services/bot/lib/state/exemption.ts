import {ExemptionKind, Exemptions} from '@prisma/client';
import {RedisClientType} from 'redis';

import {ExemptionCached} from '../protos/caches_pb';

export class ExemptionState {
  constructor(private redis: RedisClientType) {}

  #ttl = 60 * 60 * 2; // 2 hours

  #cacheKey(guildID: string, id: string): string {
    return `exemption:${guildID}-${id}`;
  }

  #isExemptCacheKey(guildID: string, id: string): string {
    return `is_exempt:${guildID}-${id}`;
  }

  async set(exemption: Exemptions) {
    const val = new ExemptionCached();
    val.setKind(exemptionKindToProto(exemption.kind));

    const ser = val.serializeBinary();

    return this.redis.setEx(
      this.#cacheKey(exemption.guildId, exemption.id),
      this.#ttl,
      Buffer.from(ser).toString('base64')
    );
  }

  async get(guildID: string, id: string): Promise<Exemptions | null> {
    const fromRedis = await this.redis.get(this.#cacheKey(guildID, id));
    if (!fromRedis) {
      return null;
    }

    const buf = Buffer.from(fromRedis, 'base64');
    const deser = ExemptionCached.deserializeBinary(buf);

    return {
      id,
      kind: protoToExemptionKind(deser.getKind()),
      guildId: guildID,
    };
  }

  async del(guildID: string, id: string) {
    return this.redis.del(this.#cacheKey(guildID, id));
  }

  async exists(guildID: string, id: string) {
    return this.redis.exists(this.#cacheKey(guildID, id)).then(r => !!r);
  }

  async setIsExempt(guildID: string, id: string, e: boolean) {
    return this.redis.setEx(
      this.#isExemptCacheKey(guildID, id),
      this.#ttl,
      String(+e)
    );
  }

  async getIsExempt(guildID: string, id: string) {
    return this.redis
      .get(this.#isExemptCacheKey(guildID, id))
      .then(r => (r === null ? null : !!+r));
  }
}

const exemptionKindToProto = (k: ExemptionKind) =>
  ExemptionCached.ExemptionKind[k];

type ProtoExemptionKind = ExemptionCached.ExemptionKindMap;
const protoToExemptionKind = (
  val: ProtoExemptionKind[keyof ProtoExemptionKind]
): ExemptionKind =>
  (
    Object.keys(ExemptionCached.ExemptionKind) as (keyof ProtoExemptionKind)[]
  ).find(k => ExemptionCached.ExemptionKind[k] === val)!;
