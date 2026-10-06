const amqp = require('amqplib');

const RABBITMQ_URL =
  process.env.RABBITMQ_URL ?? 'amqp://guest:guest@127.0.0.1:5672';

async function main() {
  const connection = await amqp.connect(RABBITMQ_URL);
  const channel = await connection.createChannel();

  await channel.assertExchange('bms.events', 'topic', {
    durable: true,
  });

  await channel.assertQueue('bms.book.events', {
    durable: true,
  });

  await channel.bindQueue('bms.book.events', 'bms.events', 'book.created');

  console.log('✅ Connected to RabbitMQ.');
  console.log('✅ Waiting for book.created events...');

  await channel.consume('bms.book.events', message => {
    if (!message) {
      return;
    }

    try {
      const content = JSON.parse(message.content.toString());

      console.log('\n📨 Event received:');
      console.log(JSON.stringify(content, null, 2));

      channel.ack(message);

      console.log('✅ Message acknowledged.');
    } catch (error) {
      console.error('❌ Failed to process message:', error);

      channel.nack(message, false, false);
    }
  });
}

main().catch(error => {
  console.error('❌ Consumer failed to start.');
  console.error(error);
  process.exit(1);
});
