import {Interaction} from 'discord.js';
import {ClientEventNames, Event} from 'fish';

export class InteractionCreateEvent extends Event {
  name: ClientEventNames = 'interactionCreate';

  async run(i: Interaction) {
    if (i.isCommand()) {
      const cmd = i.client.cmds.get(i.commandName);

      if (cmd) {
        try {
          await cmd.run(i);
          this.client.metrics.addCommandUsage(i.commandName, true);
        } catch {
          this.client.metrics.addCommandUsage(i.commandName, false);
        }
      }
    }
  }
}
