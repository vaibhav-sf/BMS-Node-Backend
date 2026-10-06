const {MessageQueueService} = require('../dist/services/message-queue.service');

async function main() {
  const messageQueueService = new MessageQueueService();

  try {
    await messageQueueService.setupBookEventsQueue();

    const testBook = {
      book_id: 9999,
      title: 'RabbitMQ Test Book',
      book_isbn: '9999999999',
      published_year: 2026,
      book_type: 'printed book',
      author_id: 20,
      category_id: 1,
    };

    await messageQueueService.publishEvent('book.created', testBook);

    console.log('✅ Connected to RabbitMQ.');
    console.log('✅ Exchange "bms.events" is ready.');
    console.log('✅ Queue "bms.book.events" is ready.');
    console.log('✅ Published "book.created" event.');
  } catch (error) {
    console.error('❌ RabbitMQ publish test failed.');
    console.error(error);
    process.exitCode = 1;
  } finally {
    await messageQueueService.close();
  }
}

main();
