import {ClientEventNames, Event} from 'fish';

export class RawEvent extends Event {
  name = 'raw' as ClientEventNames;

  async run(data: {t: string | null}) {
    const evt = data.t;

    if (evt && this.client.isReady()) {
      this.client.metrics.addGatewayEvent(evt);
    }
  }
}
