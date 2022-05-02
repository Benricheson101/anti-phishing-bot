import type {RedisClientType} from 'redis';

import {CheckMembersButtonState} from './checkMembersButton';

export * from './checkMembersButton';

export class State {
  constructor(private client: RedisClientType) {}

  checkMembersButton = new CheckMembersButtonState(this.client);
}
