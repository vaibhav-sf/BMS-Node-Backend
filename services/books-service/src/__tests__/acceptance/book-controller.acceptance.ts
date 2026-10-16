import {Client, expect} from '@loopback/testlab';
import {BooksServiceApplication} from '../..';
import {BookRepository} from '../../repositories';
import {setupApplication} from './test-helper';
import {FakeMessageQueueService} from './fake-message-queue.service';
import {bookEventsPublishFailuresTotal} from '../../services/metrics.service';

describe('BookController (acceptance)', () => {
  let app: BooksServiceApplication;
  let client: Client;
  let bookRepository: BookRepository;

  // Track only the rows created by these tests so cleanup never touches
  // pre-existing data in books_db.
  const createdIds: number[] = [];

  let isbnCounter = 0;
  // Generates a unique, test-only 10-digit ISBN in the 99xxxxxxxx range so it
  // never collides with existing seed rows.
  function uniqueIsbn(): string {
    isbnCounter += 1;
    return '99' + String(isbnCounter).padStart(8, '0');
  }

  function givenBook(
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> {
    return {
      title: 'Acceptance Test Book',
      book_isbn: uniqueIsbn(),
      published_year: 2020,
      book_type: 'printed book',
      page_count: 100,
      file_size: 12.5,
      author_id: 1,
      category_id: 1,
      ...overrides,
    };
  }

  function omit(
    obj: Record<string, unknown>,
    key: string,
  ): Record<string, unknown> {
    const copy = {...obj};
    delete copy[key];
    return copy;
  }

  before('setupApplication', async () => {
    ({app, client} = await setupApplication());
    bookRepository = await app.getRepository(BookRepository);
  });

  after(async () => {
    for (const id of createdIds) {
      try {
        await bookRepository.deleteById(id);
      } catch {
        // Row already removed by a test (e.g. the delete lifecycle test).
      }
    }
    await app.stop();
  });

  it('1. creates a book and returns actual HTTP 201', async () => {
    const res = await client.post('/books').send(givenBook()).expect(201);
    expect(res.body.book_id).to.be.a.Number();
    expect(res.body.title).to.equal('Acceptance Test Book');
    createdIds.push(res.body.book_id);
  });

  it('returns 201 and keeps the book when event publishing fails', async () => {
    const before =
      (await bookEventsPublishFailuresTotal.get()).values[0]?.value ?? 0;
    FakeMessageQueueService.failPublishing = true;
    try {
      const response = await client
        .post('/books')
        .send(givenBook())
        .expect(201);
      createdIds.push(response.body.book_id);

      const saved = await bookRepository.findById(response.body.book_id);
      expect(saved.title).to.equal('Acceptance Test Book');
      const after =
        (await bookEventsPublishFailuresTotal.get()).values[0]?.value ?? 0;
      expect(after).to.equal(before + 1);
    } finally {
      FakeMessageQueueService.failPublishing = false;
    }
  });

  it('2. rejects a book with a missing required field (title)', async () => {
    await client.post('/books').send(omit(givenBook(), 'title')).expect(422);
  });

  it('3. rejects a book with an empty title', async () => {
    await client
      .post('/books')
      .send(givenBook({title: ''}))
      .expect(422);
  });

  it('4. rejects a book whose ISBN is not exactly 10 digits', async () => {
    await client
      .post('/books')
      .send(givenBook({book_isbn: '123'}))
      .expect(422);
  });

  it('5. rejects an invalid book_type', async () => {
    await client
      .post('/books')
      .send(givenBook({book_type: 'audiobook'}))
      .expect(422);
  });

  it('6. rejects a published_year in the future', async () => {
    await client
      .post('/books')
      .send(givenBook({published_year: 3000}))
      .expect(422);
  });

  it('7. rejects a non-positive page_count', async () => {
    await client
      .post('/books')
      .send(givenBook({page_count: 0}))
      .expect(422);
  });

  it('8. rejects a duplicate ISBN with 409 Conflict', async () => {
    const isbn = uniqueIsbn();
    const first = await client
      .post('/books')
      .send(givenBook({book_isbn: isbn}))
      .expect(201);
    createdIds.push(first.body.book_id);
    await client
      .post('/books')
      .send(givenBook({book_isbn: isbn}))
      .expect(409);
  });

  it('9. does not honor a client-supplied book_id', async () => {
    const res = await client.post('/books').send(givenBook({book_id: 999999}));
    expect([201, 422]).to.containEql(res.status);
    if (res.status === 201) {
      expect(res.body.book_id).to.not.equal(999999);
      createdIds.push(res.body.book_id);
    }
  });

  it('10. lists books (200) and returns a count (200)', async () => {
    await client.get('/books').expect(200);
    const res = await client.get('/books/count').expect(200);
    expect(res.body).to.have.property('count');
  });

  it('11. gets a book by id (200) and 404s for a missing id', async () => {
    const created = await client.post('/books').send(givenBook()).expect(201);
    createdIds.push(created.body.book_id);

    const res = await client.get(`/books/${created.body.book_id}`).expect(200);
    expect(res.body.book_id).to.equal(created.body.book_id);

    await client.get('/books/98765432').expect(404);
  });

  it('12. supports PATCH (204), PUT (204) and DELETE (204) lifecycle', async () => {
    const created = await client.post('/books').send(givenBook()).expect(201);
    const id = created.body.book_id;

    // PATCH partial update -> 204
    await client
      .patch(`/books/${id}`)
      .send({title: 'Patched Title'})
      .expect(204);
    const patched = await client.get(`/books/${id}`).expect(200);
    expect(patched.body.title).to.equal('Patched Title');

    // PUT full replacement -> 204
    const replacement = givenBook({
      title: 'Replaced Title',
      book_isbn: uniqueIsbn(),
    });
    await client.put(`/books/${id}`).send(replacement).expect(204);
    const replaced = await client.get(`/books/${id}`).expect(200);
    expect(replaced.body.title).to.equal('Replaced Title');

    // DELETE -> 204, then the row is gone -> 404
    await client.del(`/books/${id}`).expect(204);
    await client.get(`/books/${id}`).expect(404);
  });

  it('rejects invalid author/category references on all update paths', async () => {
    const created = await client.post('/books').send(givenBook()).expect(201);
    const id = created.body.book_id;
    createdIds.push(id);

    await client.patch(`/books/${id}`).send({author_id: 999999}).expect(422);
    await client.patch(`/books/${id}`).send({category_id: 999999}).expect(422);
    await client
      .put(`/books/${id}`)
      .send(givenBook({author_id: 999999}))
      .expect(422);
    await client
      .put(`/books/${id}`)
      .send(givenBook({category_id: 999999}))
      .expect(422);
    await client
      .patch('/books')
      .query({where: JSON.stringify({book_id: id})})
      .send({author_id: 999999})
      .expect(422);
    await client
      .patch('/books')
      .query({where: JSON.stringify({book_id: id})})
      .send({category_id: 999999})
      .expect(422);

    const unchanged = await bookRepository.findById(id);
    expect(unchanged.author_id).to.equal(1);
    expect(unchanged.category_id).to.equal(1);
  });

  it('allows a valid filtered bulk update', async () => {
    const created = await client.post('/books').send(givenBook()).expect(201);
    const id = created.body.book_id;
    createdIds.push(id);

    const result = await client
      .patch('/books')
      .query({where: JSON.stringify({book_id: id})})
      .send({title: 'Filtered bulk update'})
      .expect(200);
    expect(result.body).to.containEql({count: 1});

    const updated = await bookRepository.findById(id);
    expect(updated.title).to.equal('Filtered bulk update');
    expect(updated.author_id).to.equal(1);
    expect(updated.category_id).to.equal(1);
  });

  it('rejects missing and empty filters for bulk PATCH without changing rows', async () => {
    const created = await client.post('/books').send(givenBook()).expect(201);
    const id = created.body.book_id;
    createdIds.push(id);
    const originalTitle = created.body.title;

    await client
      .patch('/books')
      .send({title: 'Should Not Update All'})
      .expect(400);
    await client
      .patch('/books')
      .query({where: JSON.stringify({})})
      .send({title: 'Should Not Update All'})
      .expect(400);

    const unchanged = await bookRepository.findById(id);
    expect(unchanged.title).to.equal(originalTitle);
  });
});
