import {Client, expect} from '@loopback/testlab';
import {CategoriesServiceApplication} from '../..';
import {setupApplication} from './test-helper';

describe('CategoryController', () => {
  let app: CategoriesServiceApplication;
  let client: Client;

  before('setupApplication', async () => {
    ({app, client} = await setupApplication());
  });

  after(async () => {
    await app.stop();
  });

  it('creates a category with POST /categories', async () => {
    const categoryName = `Test Category ${Date.now()}`;
    let categoryId: number | undefined;

    try {
      const res = await client
        .post('/categories')
        .send({
          category_name: categoryName,
        })
        .expect(201);

      categoryId = res.body.category_id;

      expect(res.body).to.containEql({
        category_name: categoryName,
      });

      expect(res.body.category_id).to.not.equal(undefined);
      expect(res.body.created_at).to.not.equal(undefined);
    } finally {
      if (categoryId !== undefined) {
        await client.delete(`/categories/${categoryId}`).expect(204);
      }
    }
  });

  it('lists categories with GET /categories', async () => {
    const categoryName = `List Test ${Date.now()}`;
    let categoryId: number | undefined;

    try {
      const createRes = await client
        .post('/categories')
        .send({
          category_name: categoryName,
        })
        .expect(201);

      categoryId = createRes.body.category_id;

      const res = await client.get('/categories').expect(200);

      expect(res.body).to.be.Array();

      const createdCategory = res.body.find(
        (category: {category_id?: number}) =>
          category.category_id === categoryId,
      );

      expect(createdCategory).to.containEql({
        category_id: categoryId,
        category_name: categoryName,
      });
    } finally {
      if (categoryId !== undefined) {
        await client.delete(`/categories/${categoryId}`).expect(204);
      }
    }
  });
  it('gets a category by ID with GET /categories/{id}', async () => {
    const categoryName = `Get Test ${Date.now()}`;
    let categoryId: number | undefined;

    try {
      const createRes = await client
        .post('/categories')
        .send({
          category_name: categoryName,
        })
        .expect(201);

      categoryId = createRes.body.category_id;

      const res = await client.get(`/categories/${categoryId}`).expect(200);

      expect(res.body).to.containEql({
        category_id: categoryId,
        category_name: categoryName,
      });

      expect(res.body.created_at).to.not.equal(undefined);
    } finally {
      if (categoryId !== undefined) {
        await client.delete(`/categories/${categoryId}`).expect(204);
      }
    }
  });
  it('returns 404 for a nonexistent category', async () => {
    await client.get('/categories/999999999').expect(404);
  });
  it('returns the category count with GET /categories/count', async () => {
    const categoryName = `Count Test ${Date.now()}`;
    let categoryId: number | undefined;

    try {
      const createRes = await client
        .post('/categories')
        .send({
          category_name: categoryName,
        })
        .expect(201);

      categoryId = createRes.body.category_id;

      const res = await client.get('/categories/count').expect(200);

      expect(res.body.count).to.be.a.Number();
      expect(res.body.count).to.be.greaterThan(0);
    } finally {
      if (categoryId !== undefined) {
        await client.delete(`/categories/${categoryId}`).expect(204);
      }
    }
  });
  it('updates a category with PATCH /categories/{id}', async () => {
    const originalName = `Patch Test ${Date.now()}`;
    const updatedName = `Patched Category ${Date.now()}`;
    let categoryId: number | undefined;

    try {
      const createRes = await client
        .post('/categories')
        .send({
          category_name: originalName,
        })
        .expect(201);

      categoryId = createRes.body.category_id;

      const createdAt = createRes.body.created_at;

      await client
        .patch(`/categories/${categoryId}`)
        .send({
          category_name: updatedName,
        })
        .expect(204);

      const res = await client.get(`/categories/${categoryId}`).expect(200);

      expect(res.body).to.containEql({
        category_id: categoryId,
        category_name: updatedName,
      });

      expect(res.body.created_at).to.equal(createdAt);
    } finally {
      if (categoryId !== undefined) {
        await client.delete(`/categories/${categoryId}`).expect(204);
      }
    }
  });
  it('rejects whitespace-only category_name in PATCH /categories/{id}', async () => {
    let categoryId: number | undefined;

    try {
      const createRes = await client
        .post('/categories')
        .send({
          category_name: `Whitespace Test ${Date.now()}`,
        })
        .expect(201);

      categoryId = createRes.body.category_id;

      await client
        .patch(`/categories/${categoryId}`)
        .send({
          category_name: '   ',
        })
        .expect(422);
    } finally {
      if (categoryId !== undefined) {
        await client.delete(`/categories/${categoryId}`).expect(204);
      }
    }
  });
  it('rejects category_id in PATCH /categories/{id}', async () => {
    let categoryId: number | undefined;

    try {
      const createRes = await client
        .post('/categories')
        .send({
          category_name: `Protected ID Test ${Date.now()}`,
        })
        .expect(201);

      categoryId = createRes.body.category_id;

      await client
        .patch(`/categories/${categoryId}`)
        .send({
          category_id: 999,
          category_name: 'Updated Name',
        })
        .expect(422);
    } finally {
      if (categoryId !== undefined) {
        await client.delete(`/categories/${categoryId}`).expect(204);
      }
    }
  });
  it('rejects created_at in PATCH /categories/{id}', async () => {
    let categoryId: number | undefined;

    try {
      const createRes = await client
        .post('/categories')
        .send({
          category_name: `Protected Date Test ${Date.now()}`,
        })
        .expect(201);

      categoryId = createRes.body.category_id;

      await client
        .patch(`/categories/${categoryId}`)
        .send({
          category_name: 'Updated Name',
          created_at: '2020-01-01T00:00:00.000Z',
        })
        .expect(422);
    } finally {
      if (categoryId !== undefined) {
        await client.delete(`/categories/${categoryId}`).expect(204);
      }
    }
  });
  it('replaces a category with PUT /categories/{id}', async () => {
    const originalName = `PUT Test ${Date.now()}`;
    const updatedName = `Replaced Category ${Date.now()}`;
    let categoryId: number | undefined;

    try {
      const createRes = await client
        .post('/categories')
        .send({
          category_name: originalName,
        })
        .expect(201);

      categoryId = createRes.body.category_id;
      const createdAt = createRes.body.created_at;

      await client
        .put(`/categories/${categoryId}`)
        .send({
          category_name: updatedName,
        })
        .expect(204);

      const res = await client.get(`/categories/${categoryId}`).expect(200);

      expect(res.body).to.containEql({
        category_id: categoryId,
        category_name: updatedName,
      });

      expect(res.body.created_at).to.equal(createdAt);
    } finally {
      if (categoryId !== undefined) {
        await client.delete(`/categories/${categoryId}`).expect(204);
      }
    }
  });
  it('rejects whitespace-only category_name in PUT /categories/{id}', async () => {
    let categoryId: number | undefined;

    try {
      const createRes = await client
        .post('/categories')
        .send({
          category_name: `PUT Whitespace ${Date.now()}`,
        })
        .expect(201);

      categoryId = createRes.body.category_id;

      await client
        .put(`/categories/${categoryId}`)
        .send({
          category_name: '   ',
        })
        .expect(422);
    } finally {
      if (categoryId !== undefined) {
        await client.delete(`/categories/${categoryId}`).expect(204);
      }
    }
  });
  it('rejects category_id in PUT /categories/{id}', async () => {
    let categoryId: number | undefined;

    try {
      const createRes = await client
        .post('/categories')
        .send({
          category_name: `PUT Protected ID ${Date.now()}`,
        })
        .expect(201);

      categoryId = createRes.body.category_id;

      await client
        .put(`/categories/${categoryId}`)
        .send({
          category_id: 999,
          category_name: 'Updated Name',
        })
        .expect(422);
    } finally {
      if (categoryId !== undefined) {
        await client.delete(`/categories/${categoryId}`).expect(204);
      }
    }
  });
  it('rejects created_at in PUT /categories/{id}', async () => {
    let categoryId: number | undefined;

    try {
      const createRes = await client
        .post('/categories')
        .send({
          category_name: `PUT Protected Date ${Date.now()}`,
        })
        .expect(201);

      categoryId = createRes.body.category_id;

      await client
        .put(`/categories/${categoryId}`)
        .send({
          category_name: 'Updated Name',
          created_at: '2020-01-01T00:00:00.000Z',
        })
        .expect(422);
    } finally {
      if (categoryId !== undefined) {
        await client.delete(`/categories/${categoryId}`).expect(204);
      }
    }
  });
  it('updates filtered categories with PATCH /categories', async () => {
    const originalName = `Bulk Patch Test ${Date.now()}`;
    const updatedName = `Bulk Updated ${Date.now()}`;
    let categoryId: number | undefined;

    try {
      const createRes = await client
        .post('/categories')
        .send({
          category_name: originalName,
        })
        .expect(201);

      categoryId = createRes.body.category_id;
      const createdAt = createRes.body.created_at;

      const patchRes = await client
        .patch('/categories')
        .query({
          where: JSON.stringify({category_id: categoryId}),
        })
        .send({
          category_name: updatedName,
        })
        .expect(200);

      expect(patchRes.body).to.containEql({count: 1});

      const res = await client.get(`/categories/${categoryId}`).expect(200);

      expect(res.body).to.containEql({
        category_id: categoryId,
        category_name: updatedName,
      });

      expect(res.body.created_at).to.equal(createdAt);
    } finally {
      if (categoryId !== undefined) {
        await client.delete(`/categories/${categoryId}`).expect(204);
      }
    }
  });
  it('rejects category_id in bulk PATCH /categories', async () => {
    await client
      .patch('/categories')
      .query({
        where: JSON.stringify({category_id: 1}),
      })
      .send({
        category_id: 999,
        category_name: 'Invalid Update',
      })
      .expect(422);
  });
  it('rejects created_at in bulk PATCH /categories', async () => {
    await client
      .patch('/categories')
      .query({
        where: JSON.stringify({category_id: 1}),
      })
      .send({
        category_name: 'Invalid Update',
        created_at: '2020-01-01T00:00:00.000Z',
      })
      .expect(422);
  });
  it('requires a where filter for bulk PATCH /categories', async () => {
    await client
      .patch('/categories')
      .send({
        category_name: 'Should Not Update All',
      })
      .expect(400);
  });
  it('rejects whitespace-only category_name in bulk PATCH /categories', async () => {
    await client
      .patch('/categories')
      .query({
        where: JSON.stringify({category_id: 1}),
      })
      .send({
        category_name: '   ',
      })
      .expect(422);
  });
  it('deletes a category with DELETE /categories/{id}', async () => {
    const categoryName = `Delete Test ${Date.now()}`;
    const createRes = await client
      .post('/categories')
      .send({
        category_name: categoryName,
      })
      .expect(201);

    const categoryId: number = createRes.body.category_id;

    try {
      await client.delete(`/categories/${categoryId}`).expect(204);

      await client.get(`/categories/${categoryId}`).expect(404);
    } finally {
      // The DELETE above may already have removed it.
      if (categoryId !== undefined) {
        try {
          await client.delete(`/categories/${categoryId}`);
        } catch {
          // Ignore because the category may already be deleted.
        }
      }
    }
  });
  it('returns 404 when deleting a nonexistent category', async () => {
    await client.delete('/categories/999999999').expect(404);
  });
});
