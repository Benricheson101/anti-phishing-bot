import {ClientEventNames, Event} from 'fish';

export class ReadyEvent extends Event {
  name: ClientEventNames = 'ready';

  async run() {
    console.log('Ready as', this.client.user?.tag);

    this.client.metrics.updateGuildCount();
    this.client.metrics.updateGatewayPing();
    setInterval(() => {
      this.client.metrics.updateGuildCount();
      this.client.metrics.updateGatewayPing();
    }, 1_000 * 30);
  }
}
