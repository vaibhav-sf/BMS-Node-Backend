import {inject} from '@loopback/core';
import {get, Response, RestBindings} from '@loopback/rest';
import {metricsRegistry} from '../services/metrics.service';

export class MetricsController {
  constructor(
    @inject(RestBindings.Http.RESPONSE)
    private readonly response: Response,
  ) {}

  @get('/metrics')
  async metrics(): Promise<void> {
    this.response.type('text/plain');
    this.response.send(await metricsRegistry.metrics());
  }
}
