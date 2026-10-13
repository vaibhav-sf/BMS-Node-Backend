// Integration test for a dedicated local Compose environment. This restarts
// the explicitly named RabbitMQ container; never point it at a shared broker.
const {execFileSync} = require('child_process');
const {MessageQueueService} = require('../../books-service/dist/services/message-queue.service');

const url = process.env.RABBITMQ_URL;
const containerName = process.env.RABBITMQ_CONTAINER_NAME;
const metricsUrl =
  process.env.CONSUMER_METRICS_URL ?? 'http://127.0.0.1:3004/metrics';
const timeoutMs = 60000;
const publisher = new MessageQueueService();

if (!url || !containerName || !/^[a-zA-Z0-9_.-]+$/.test(containerName)) {
  throw new Error(
    'Set RABBITMQ_URL and an isolated RABBITMQ_CONTAINER_NAME before running this test',
  );
}

async function publishTestEvent() {
  await publisher.publishEvent('book.created', {
    book_id: 0,
    title: 'RabbitMQ reconnect test',
  });
}

async function getConsumedCount() {
  const response = await fetch(metricsUrl, {signal: AbortSignal.timeout(3000)});
  if (!response.ok) throw new Error(`Metrics endpoint returned ${response.status}`);
  const metrics = await response.text();
  const match = metrics.match(/^book_events_consumed_total\s+(\d+(?:\.\d+)?)/m);
  if (!match) throw new Error('Consumer metric was not found');
  return Number(match[1]);
}

async function waitFor(predicate, description) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      if (await predicate()) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error(`Timed out waiting for ${description}`, {cause: lastError});
}

async function main() {
  await publisher.setupBookEventsQueue();
  await waitFor(async () => {
    await getConsumedCount();
    return true;
  }, 'consumer metrics endpoint');

  const before = await getConsumedCount();
  await publishTestEvent();
  await waitFor(async () => (await getConsumedCount()) > before, 'initial event delivery');

  execFileSync('docker', ['restart', containerName], {stdio: 'inherit'});

  const afterRestart = await getConsumedCount();
  await waitFor(async () => {
    try {
      await publishTestEvent();
      return true;
    } catch {
      return false;
    }
  }, 'producer reconnection after RabbitMQ restart');

  await waitFor(async () => (await getConsumedCount()) > afterRestart, 'event delivery after RabbitMQ restart');

  console.log('RabbitMQ consumer recovered and delivered an event after restart.');
}

main()
  .catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => publisher.close());
