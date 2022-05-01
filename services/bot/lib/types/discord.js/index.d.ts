import {Collection} from 'discord.js';

import {Command, Database, Logger} from '../..';

declare module 'discord.js' {
  export interface Client {
    cmds: Collection<string, Command>;
    db: Database;
    logger: Logger;
  }
}
