import {Command, Database} from '../..';

import {Collection} from 'discord.js';

declare module 'discord.js' {
  export interface Client {
    cmds: Collection<string, Command>;
    db: Database;
  }

  export class Base {
    public readonly client: Client;
  }
}
