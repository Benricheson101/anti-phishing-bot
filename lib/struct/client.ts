import {Client as DJSClient, ClientOptions, Collection} from 'discord.js';
import {Command, Database, Event, ServiceManager} from '..';

import {promises} from 'fs';
import {join} from 'path';

import readdir = promises.readdir;
import {PrismaClient} from '@prisma/client';
import {Logger} from './logger';

export class Client extends DJSClient {
  cmds = new Collection<string, Command>();
  db!: Database;

  services!: ServiceManager;

  #evtDir: string;
  #cmdDir: string;

  constructor(
    ops: ClientOptions & {cmdDir?: string; evtDir?: string} = {
      cmdDir: join(__dirname, '../../src/cmds'),
      evtDir: join(__dirname, '../../events/cmds'),
      intents: ['GUILDS', 'GUILD_MESSAGES'],
    }
  ) {
    super(ops);

    this.#cmdDir = ops.cmdDir || join(__dirname, '../../src/cmds');
    this.#evtDir = ops.evtDir || join(__dirname, '../../events/cmds');
  }

  async init(): Promise<this> {
    await this.loadCommands();
    await this.loadEvents();

    this.db = new Database(new PrismaClient());
    this.logger = new Logger(this);
    this.services = new ServiceManager(this);

    return this;
  }

  async loadCommands() {
    const cmds = (await this.readdir(this.#cmdDir, Command).then(cmds =>
      cmds.map(c => new c(this))
    )) as Command[];

    for (const cmd of cmds) {
      this.cmds.set(cmd.name, cmd);
    }
  }

  async loadEvents() {
    const events = (await this.readdir(this.#evtDir, Event).then(evts =>
      evts.map(evt => new evt(this))
    )) as Event[];

    events
      .filter(e => !e.once)
      .map(e => {
        this.on(e.name, (...args) => e.run(...args));
      });

    events
      .filter(e => e.once)
      .map(e => {
        this.once(e.name, (...args) => e.run(...args));
      });
  }

  private async readdir<T extends new (...args: unknown[]) => T>(
    dir: string,
    kind: unknown
  ): Promise<T[]> {
    return readdir(dir)
      .then(files =>
        files
          .filter(f =>
            __filename.endsWith('.ts') ? f.endsWith('.ts') : f.endsWith('.js')
          )
          .map(f => import(join(dir, f)))
      )
      .then(Promise.all.bind(Promise))
      .then(imports =>
        (imports as {[key: string]: T}[])
          .map(Object.values)
          .flat()
          .filter(o => Object.getPrototypeOf(o) === kind)
      );
  }
}
