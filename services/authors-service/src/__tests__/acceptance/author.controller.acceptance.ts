import {Client, expect} from '@loopback/testlab';
import {AuthorsServiceApplication} from '../..';
import {AuthorRepository} from '../../repositories';
import {setupApplication} from './test-helper';

describe('AuthorController (acceptance)', () => {
  let app: AuthorsServiceApplication;
  let client: Client;
  let authorRepo: AuthorRepository;
  const createdIds: number[] = [];
  // Unique suffix so repeated runs don't collide on the unique email index.
  const suffix = Date.now();

  before('setupApplication', async () => {
    ({app, client} = await setupApplication());
    authorRepo = await app.get<AuthorRepository>(
      'repositories.AuthorRepository',
    );
  });

  after(async () => {
    // Clean up rows created during the run so the test is repeatable.
    for (const id of createdIds) {
      try {
        await authorRepo.deleteById(id);
      } catch {
        // already removed by a test case
      }
    }
    if (app) await app.stop();
  });

  it('creates an author (POST /authors)', async () => {
    const res = await client
      .post('/authors')
      .send({
        name: 'Jane Austen',
        email: `jane.${suffix}@example.com`,
        bio: 'Novelist',
      })
      .expect(200);
    expect(res.body).to.containDeep({name: 'Jane Austen'});
    expect(res.body.author_id).to.be.a.Number();
    expect(res.body.created_at).to.be.a.String();
    createdIds.push(res.body.author_id);
  });

  it('lists all authors (GET /authors)', async () => {
    const res = await client.get('/authors').expect(200);
    expect(res.body).to.be.an.Array();
  });

  it('gets an author by id (GET /authors/{id})', async () => {
    const id = createdIds[0];
    const res = await client.get(`/authors/${id}`).expect(200);
    expect(res.body.author_id).to.equal(id);
    expect(res.body.name).to.equal('Jane Austen');
  });

  it('updates an author (PATCH /authors/{id})', async () => {
    const id = createdIds[0];
    await client
      .patch(`/authors/${id}`)
      .send({bio: 'English novelist'})
      .expect(204);
    const res = await client.get(`/authors/${id}`).expect(200);
    expect(res.body.bio).to.equal('English novelist');
  });

  it('replaces an author (PUT /authors/{id})', async () => {
    const id = createdIds[0];
    await client
      .put(`/authors/${id}`)
      .send({name: 'J. Austen', email: `jane.${suffix}@example.com`})
      .expect(204);
    const res = await client.get(`/authors/${id}`).expect(200);
    expect(res.body.name).to.equal('J. Austen');
  });

  it('rejects an invalid email (POST /authors)', async () => {
    await client
      .post('/authors')
      .send({name: 'Bad Email', email: 'not-an-email'})
      .expect(422);
  });

  it('rejects a missing name (POST /authors)', async () => {
    await client
      .post('/authors')
      .send({email: `noname.${suffix}@example.com`})
      .expect(422);
  });

  it('rejects a missing email (POST /authors)', async () => {
    await client.post('/authors').send({name: 'No Email'}).expect(422);
  });

  it('rejects a duplicate email (POST /authors)', async () => {
    const email = `dup.${suffix}@example.com`;
    const first = await client
      .post('/authors')
      .send({name: 'First', email})
      .expect(200);
    createdIds.push(first.body.author_id);
    await client.post('/authors').send({name: 'Second', email}).expect(409);
  });

  it('deletes an author (DELETE /authors/{id})', async () => {
    const res = await client
      .post('/authors')
      .send({name: 'Temp', email: `temp.${suffix}@example.com`})
      .expect(200);
    const id = res.body.author_id;
    await client.del(`/authors/${id}`).expect(204);
    await client.get(`/authors/${id}`).expect(404);
  });
});
