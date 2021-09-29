import {Event} from 'fish';

export class ReadyEvent extends Event {
  name = 'ready';

  async run() {
    console.log('Ready as', this.client.user?.tag);
  }
}
