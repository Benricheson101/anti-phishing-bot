import {PrismaClient} from '@prisma/client';
import {ClientOptions, Collection, Client as DJSClient} from 'discord.js';
import {promises} from 'fs';
import {join} from 'path';
import {RedisClientType, createClient} from 'redis';

import {Command, Database, Event, ServiceManager, State} from '..';
import {Logger} from './logger';
import {Metrics} from './metric';

import readdir = promises.readdir;

export class Client extends DJSClient {
  metrics = new Metrics(this);

  cmds = new Collection<string, Command>();
  db!: Database;
  state!: State;

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

    const postgres = new PrismaClient();

    const redis = createClient({
      url: process.env.REDIS_URL,
    }) as RedisClientType;
    await redis.connect();

    this.state = new State(redis);
    this.db = new Database(postgres, this.state);
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
