import {ApplicationCommand, CommandInteraction} from 'discord.js';
import {Client} from './client';

export abstract class Command {
  abstract name: string;
  abstract description: string;

  constructor(protected client: Client) {}

  abstract options?: ApplicationCommand['options'];

  abstract run(i: CommandInteraction): Promise<void>;

  toJSON() {
    const {name, description, options} = this;

    return {name, description, options};
  }
}
