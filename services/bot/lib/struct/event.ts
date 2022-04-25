import {ClientEvents} from 'discord.js';
import {Client} from 'fish';

export type ClientEventNames = keyof ClientEvents;

export abstract class Event {
  once = false;

  constructor(protected client: Client) {}

  abstract name: ClientEventNames;

  abstract run(...args: unknown[]): Promise<void>;
}
