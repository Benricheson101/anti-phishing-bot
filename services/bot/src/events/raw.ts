import {Event} from 'fish';

export class RawEvent extends Event {
  name = 'raw';

  async run(data: {t: string | null}) {
    const evt = data.t;

    if (evt && this.client.isReady()) {
      this.client.metrics.addGatewayEvent(evt);
    }
  }
}
