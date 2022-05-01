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

  cache: Map<string, CheckedUser> = new Map();

  readonly imageThreshold = 5;

  constructor(private client: Client) {}

  async checkImage(url: string): Promise<CheckImageResponse | undefined> {
    const u = new URL(url);
    if (!u.searchParams.has('size')) {
      u.searchParams.append('size', '512');
    }

    const req = new CheckImageRequest();
    req.setUrl(u.toString());

    return new Promise((res, rej) => {
      this.#checkerService.checkImage(req, (err, val) => {
        if (err) {
          console.log('Error checking image:', url, err);
          return rej(err);
        }

        return res(val);
      });
    });
  }

  // TODO: near match usernames?
  checkUsername(username: string): boolean {
    const normalized = remove(username).replace(/\s/g, '').toLowerCase();

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
      'message',
      'mod',
      'notif',
      'recurit',
      'staff',
      'system',
      'team',
      'terms',
    ];

    return keywords.some(w => normalized.includes(w));
  }

  // TODO: this should probably return more data, like hash distance
  async checkMember(m: GuildMember): Promise<CheckedUser> {
    const u = m.user;

    const cacheKey = JSON.stringify({
      id: u.id,
      username: u.username,
      avatar: u.avatar,
    });

    const verdict: CheckedUser = {
      user: u,
      matchedUsername: false,
      matchedAvatar: false,
    };

    if (u.bot || u.avatar?.startsWith('a_')) {
      this.cache.set(cacheKey, verdict);
      return verdict;
    }

    // filters out most users before making DB queries
    const usernameMatches = this.checkUsername(u.username);
    if (!usernameMatches) {
      this.cache.set(cacheKey, verdict);
      return verdict;
    }
    verdict.matchedUsername = true;

    const isExempt = await this.client.db.exemptions.isExempt(m);

    if (isExempt) {
      this.cache.set(cacheKey, verdict);
      return verdict;
    }

    const fromCache = this.cache.get(cacheKey);
    if (fromCache) {
      return fromCache;
    }

    const av = u.avatarURL({dynamic: false, format: 'png', size: 4096});
    if (!av) {
      this.cache.set(cacheKey, verdict);
      // TODO: what should happen if they don't have an avatar?
      return verdict;
    }

    try {
      const checkedAvatar = await this.checkImage(av);
      if (!checkedAvatar) {
        this.cache.set(cacheKey, verdict);
        return verdict;
      }

      verdict.nearestAvatar = checkedAvatar;

      if (checkedAvatar.getPhashDistance() <= this.imageThreshold) {
        verdict.matchedAvatar = true;

        this.client.metrics.addAbusiveUser(verdict);

        this.cache.set(cacheKey, verdict);
        return verdict;
      }
    } catch (err) {
      console.log(`failed to check for user ${u.id} ${av}:`, err);
    }

    this.cache.set(cacheKey, verdict);
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
