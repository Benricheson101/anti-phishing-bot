import {Client} from 'fish';

export abstract class Event {
  once = false;

  constructor(protected client: Client) {}

  abstract name: string;

  abstract run(...args: unknown[]): Promise<void>;
}
