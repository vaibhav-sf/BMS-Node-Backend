import {Counter, Registry, collectDefaultMetrics} from 'prom-client';

export const metricsRegistry = new Registry();

collectDefaultMetrics({
  register: metricsRegistry,
});

export const booksCreatedTotal = new Counter({
  name: 'books_created_total',
  help: 'Total number of books successfully created',
  registers: [metricsRegistry],
});

export const bookEventsPublishedTotal = new Counter({
  name: 'book_events_published_total',
  help: 'Total number of book events published to RabbitMQ',
  registers: [metricsRegistry],
});
