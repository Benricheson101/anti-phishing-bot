import {Interaction} from 'discord.js';
import {ClientEventNames, Event} from 'fish';
import {handleCheckMembersButton} from '../buttons/checkMembers';

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
    } else if (i.isButton()) {
      const [kind] = i.customId.split(':');
      switch (kind) {
        case 'check_members': {
          await handleCheckMembersButton(this.client, i);
          break;
        }
      }
    }
  }
}
