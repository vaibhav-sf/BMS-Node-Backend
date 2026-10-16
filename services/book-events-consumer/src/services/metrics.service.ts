import {Counter, Registry, collectDefaultMetrics} from 'prom-client';

export const metricsRegistry = new Registry();

collectDefaultMetrics({
  register: metricsRegistry,
});

export const bookEventsConsumedTotal = new Counter({
  name: 'book_events_consumed_total',
  help: 'Total number of book events successfully consumed',
  registers: [metricsRegistry],
});

export const bookEventsFailedTotal = new Counter({
  name: 'book_events_failed_total',
  help: 'Total number of book events that failed processing',
  registers: [metricsRegistry],
});

export const bookEventsRetriedTotal = new Counter({
  name: 'book_events_retried_total',
  help: 'Total number of book events scheduled for retry',
  registers: [metricsRegistry],
});
