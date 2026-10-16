import {expect} from '@loopback/testlab';
import {CategoriesApiService} from '../../services/categories-api.service';

describe('CategoriesApiService', () => {
  const service = new CategoriesApiService();

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const originalFetch = global.fetch;

  it('returns a category when Categories Service responds with 200', async () => {
    global.fetch = async () =>
      new Response(
        JSON.stringify({
          category_id: 1,
          category_name: 'Comedy',
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

    const category = await service.getCategoryById(1);

    expect(category).to.containEql({
      category_id: 1,
      category_name: 'Comedy',
    });
  });

  it('throws 422 when Categories Service returns 404', async () => {
    global.fetch = async () => new Response(null, {status: 404});

    const error = await expect(
      service.getCategoryById(999999),
    ).to.be.rejected();

    expect(error.statusCode).to.equal(422);
    expect(error.message).to.equal('category_id 999999 does not exist');
  });

  it('throws 502 when Categories Service is unavailable', async () => {
    global.fetch = async () => {
      throw new Error('connection refused');
    };

    const error = await expect(service.getCategoryById(1)).to.be.rejected();

    expect(error.statusCode).to.equal(502);
    expect(error.message).to.equal('Categories Service is unavailable');
  });

  it('uses an abort signal and maps a timed out request to 504', async () => {
    const configurable = service as unknown as {requestTimeoutMs: number};
    configurable.requestTimeoutMs = 10;
    global.fetch = async (_url, options) =>
      new Promise((_resolve, reject) => {
        options?.signal?.addEventListener(
          'abort',
          () => reject(options.signal?.reason),
          {once: true},
        );
      });

    try {
      const startedAt = Date.now();
      const error = await expect(service.getCategoryById(1)).to.be.rejected();
      expect(error.statusCode).to.equal(504);
      expect(Date.now() - startedAt).to.be.lessThan(1000);
    } finally {
      configurable.requestTimeoutMs = 5000;
    }
  });
});
