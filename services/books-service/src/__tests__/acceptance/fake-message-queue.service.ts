import {injectable} from '@loopback/core';

@injectable()
export class FakeMessageQueueService {
  static failPublishing = false;

  async publishEvent(): Promise<void> {
    if (FakeMessageQueueService.failPublishing) {
      throw new Error('simulated broker publish failure');
    }
  }
}
