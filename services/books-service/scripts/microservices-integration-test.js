const BOOKS_URL = 'http://127.0.0.1:3001';
const AUTHORS_URL = 'http://127.0.0.1:3002';
const CATEGORIES_URL = 'http://127.0.0.1:3003';

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
  });

  let body = null;

  try {
    body = await response.json();
  } catch {
    // No JSON body, which is valid for 204 responses.
  }

  return {response, body};
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  let authorId;
  let bookId;

  const unique = Date.now();

  try {
    console.log('1. Creating temporary author...');

    const authorResult = await request(`${AUTHORS_URL}/authors`, {
      method: 'POST',
      body: JSON.stringify({
        name: `Integration Author ${unique}`,
        email: `integration.${unique}@example.com`,
        bio: 'Temporary integration-test author',
      }),
    });

    authorId = authorResult.body.author_id;

    assert(
      authorResult.response.status === 200,
      `Expected author creation 200, got ${authorResult.response.status}: ${JSON.stringify(authorResult.body)}`,
    );

    assert(authorId !== undefined, 'Authors Service did not return author_id');

    console.log(`   Author created: ${authorId}`);

    console.log('2. Checking Categories Service...');

    const categoryResult = await request(`${CATEGORIES_URL}/categories/1`);

    assert(
      categoryResult.response.status === 200,
      `Expected category 1 to exist, got ${categoryResult.response.status}`,
    );

    console.log(`   Category found: ${categoryResult.body.category_name}`);

    console.log('3. Creating book through Books Service...');

    const bookResult = await request(`${BOOKS_URL}/books`, {
      method: 'POST',
      body: JSON.stringify({
        title: `Microservices Integration Book ${unique}`,
        book_isbn: String(unique).slice(-10),
        published_year: 2025,
        book_type: 'printed book',
        page_count: 200,
        file_size: 2.5,
        author_id: authorId,
        category_id: 1,
      }),
    });

    assert(
      bookResult.response.status === 201,
      `Expected book creation 201, got ${bookResult.response.status}: ${JSON.stringify(bookResult.body)}`,
    );

    bookId = bookResult.body.book_id;

    console.log(`   Book created: ${bookId}`);

    console.log('4. Testing invalid category...');

    const invalidCategoryResult = await request(`${BOOKS_URL}/books`, {
      method: 'POST',
      body: JSON.stringify({
        title: `Invalid Category Test ${unique}`,
        book_isbn: String(unique + 1).slice(-10),
        published_year: 2025,
        book_type: 'printed book',
        page_count: 100,
        author_id: authorId,
        category_id: 999999,
      }),
    });

    assert(
      invalidCategoryResult.response.status === 422,
      `Expected invalid category to return 422, got ${invalidCategoryResult.response.status}`,
    );

    console.log('   Invalid category correctly rejected.');

    console.log('5. Testing invalid author...');

    const invalidAuthorResult = await request(`${BOOKS_URL}/books`, {
      method: 'POST',
      body: JSON.stringify({
        title: `Invalid Author Test ${unique}`,
        book_isbn: String(unique + 2).slice(-10),
        published_year: 2025,
        book_type: 'printed book',
        page_count: 100,
        author_id: 999999,
        category_id: 1,
      }),
    });

    assert(
      invalidAuthorResult.response.status === 422,
      `Expected invalid author to return 422, got ${invalidAuthorResult.response.status}`,
    );

    console.log('   Invalid author correctly rejected.');

    console.log('\n✅ Microservices integration test passed.');
  } finally {
    if (bookId !== undefined) {
      await request(`${BOOKS_URL}/books/${bookId}`, {
        method: 'DELETE',
      });
      console.log(`Cleaned up book: ${bookId}`);
    }

    if (authorId !== undefined) {
      await request(`${AUTHORS_URL}/authors/${authorId}`, {
        method: 'DELETE',
      });
      console.log(`Cleaned up author: ${authorId}`);
    }
  }
}

main().catch(error => {
  console.error('\n❌ Microservices integration test failed.');
  console.error(error.message);
  process.exit(1);
});
