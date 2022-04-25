import {Command, Database, Logger} from '../..';

import {Collection} from 'discord.js';

declare module 'discord.js' {
  export interface Client {
    cmds: Collection<string, Command>;
    db: Database;
    logger: Logger;
  }
}
