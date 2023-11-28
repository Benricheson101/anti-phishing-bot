import {credentials} from '@grpc/grpc-js';
import {remove} from 'confusables';
import {GuildMember, User} from 'discord.js';
import {URL} from 'url';

import {Client} from '..';
import {AbusiveUserServiceClient} from '../protos/abusiveUserChecker_grpc_pb';
import {
  CheckImageRequest,
  CheckImageResponse,
} from '../protos/abusiveUserChecker_pb';

export class AbusiveUserChecker {
  #checkerService = new AbusiveUserServiceClient(
    process.env.GRPC_CHECKER_SERVICE_URL,
    credentials.createInsecure()
  );

  readonly imageThreshold = 5;

  constructor(private client: Client) {}

  async checkImage(url: string): Promise<CheckImageResponse | undefined> {
    const u = new URL(url);
    // FIXME: in theory I could set this to 64x or even 32x, right?
    u.searchParams.set('size', '256'); // limits unnecessary bandwidth usage

    const req = new CheckImageRequest();
    req.setUrl(u.toString());

    return new Promise((res, rej) => {
      this.#checkerService.checkImage(req, (err, val) => {
        if (err) {
          console.error(err);
          return rej(err);
        }

        return res(val);
      });
    });
  }

  // TODO: near match usernames?
  checkUsername(username: string): boolean {
    // FIXME: sometimes this catches names like "...te Am...", how should I prevent that?
    const normalized = remove(username).toLowerCase(); // .replace(/\s/g, '').toLowerCase();

    const keywords = [
      'academy',
      'agent',
      'bot',
      'dev',
      'discord',
      'employee',
      'events',
      'hype',
      'hypesquad',
      'hype squad',
      'message',
      'mod',
      'notif',
      'recurit',
      'staff',
      'system',
      'team',
      'terms',
      'check bio',
      'see bio',
      'read bio',
      'byio',
    ];

    return keywords.some(w => normalized.includes(w));
  }

  // TODO: pull out common stuff from checkmember and checkmembers so it's not all repeated

  // TODO: im pretty sure this function is like slow af cus of all the filters
  async checkMembers(ms: GuildMember[]): Promise<GuildMember[]> {
    // easy filters
    const filteredMembers = ms.filter(
      m =>
        !m.user.bot &&
        !m.user.avatar?.startsWith('a_') &&
        (this.checkUsername(m.user.username) ||
          (m.user.globalName && this.checkUsername(m.user.globalName)))
    );

    const fromRedis = await this.client.state.abusiveUser.getMany(
      filteredMembers
    );

    const {abusive, unchecked} = fromRedis.reduce<{
      abusive: GuildMember[];
      unchecked: GuildMember[];
    }>(
      (acc, [gm, r]) => {
        if (!r) {
          acc.unchecked.push(gm);
          return acc;
        }

        if (r?.getMatchedAvatar() && r.getMatchedUsername()) {
          acc.abusive.push(gm);
          return acc;
        }

        return acc;
      },
      {abusive: [], unchecked: []}
    );

    const check = async (m: GuildMember) => {
      const c = await this.checkMember(m, false);
      if (c?.matchedUsername && c?.matchedAvatar) {
        return m;
      }
      return null;
    };

    const checkedUnchecked: GuildMember[] = (await Promise.all(
      unchecked.map(m => check(m))
    ).then(ch => ch.filter(Boolean))) as GuildMember[];

    return abusive.concat(checkedUnchecked);
  }

  // TODO: this should probably return more data, like hash distance
  async checkMember(m: GuildMember, checkCache = true): Promise<CheckedUser> {
    const u = m.user;

    const verdict: CheckedUser = {
      user: u,
      matchedUsername: false,
      matchedAvatar: false,
    };

    if (u.bot || u.avatar?.startsWith('a_')) {
      return verdict;
    }

    // filters out most users before making DB queries
    const usernameMatches =
      this.checkUsername(u.username) ||
      (u.globalName && this.checkUsername(u.globalName));
    if (!usernameMatches) {
      return verdict;
    }
    verdict.matchedUsername = true;

    const isExempt = await this.client.db.exemptions.isExempt(m);
    if (isExempt) {
      return verdict;
    }

    if (checkCache) {
      const fromCache = await this.client.state.abusiveUser.get(m);
      if (fromCache) {
        return {
          matchedUsername: fromCache.getMatchedUsername(),
          matchedAvatar: fromCache.getMatchedAvatar(),
          user: u,
          nearestAvatar: fromCache.getNearestAvatar(),
        };
      }
    }

    const av = u.displayAvatarURL({dynamic: false, format: 'png', size: 256});
    if (!av) {
      await this.client.state.abusiveUser.set(m, verdict);
      // TODO: what should happen if they don't have an avatar?
      return verdict;
    }

    try {
      const checkedAvatar = await this.checkImage(av);
      if (!checkedAvatar) {
        await this.client.state.abusiveUser.set(m, verdict);
        return verdict;
      }

      verdict.nearestAvatar = checkedAvatar;

      if (checkedAvatar.getPhashDistance() <= this.imageThreshold) {
        verdict.matchedAvatar = true;

        this.client.metrics.addAbusiveUser(verdict);

        await this.client.state.abusiveUser.set(m, verdict);
        return verdict;
      }
    } catch (err) {
      // avatar probably 404'd
    }

    await this.client.state.abusiveUser.set(m, verdict);
    return verdict;
  }
}

export interface CheckedUser {
  user: User;

  matchedUsername: boolean;
  // TODO: nearestUsername?: string;

  matchedAvatar: boolean;
  nearestAvatar?: CheckImageResponse;
}
