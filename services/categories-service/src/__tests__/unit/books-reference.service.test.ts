import {expect} from '@loopback/testlab';
import {BooksReferenceService} from '../../services/books-reference.service';

describe('BooksReferenceService for categories', () => {
  const service = new BooksReferenceService();
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('reports referenced and unreferenced categories from Books count', async () => {
    global.fetch = async url => {
      const parsed = new URL(String(url));
      expect(parsed.pathname).to.equal('/books/count');
      const where = {category_id: 8};
      expect(parsed.searchParams.get('where')).to.equal(JSON.stringify(where));
      return new Response(JSON.stringify({count: 2}), {status: 200});
    };
    expect(await service.hasBooksForCategory(8)).to.equal(true);

    global.fetch = async () =>
      new Response(JSON.stringify({count: 0}), {status: 200});
    expect(await service.hasBooksForCategory(8)).to.equal(false);
  });

  it('fails closed when Books is unavailable', async () => {
    global.fetch = async () => {
      throw new Error('offline');
    };
    const error = await expect(service.hasBooksForCategory(8)).to.be.rejected();
    expect(error.statusCode).to.equal(502);
  });
});
