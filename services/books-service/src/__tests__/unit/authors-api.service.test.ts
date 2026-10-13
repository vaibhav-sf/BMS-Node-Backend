import {expect} from '@loopback/testlab';
import {AuthorsApiService} from '../../services/authors-api.service';

describe('AuthorsApiService', () => {
  const service = new AuthorsApiService();

  afterEach(() => {
    // Restore the original fetch implementation after each test.
    global.fetch = originalFetch;
  });

  const originalFetch = global.fetch;

  it('returns an author when Authors Service responds with 200', async () => {
    global.fetch = async () =>
      new Response(
        JSON.stringify({
          author_id: 20,
          name: 'Assignment 14 Test Author',
          email: 'assignment14@example.com',
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

    const author = await service.getAuthorById(20);

    expect(author).to.containEql({
      author_id: 20,
      name: 'Assignment 14 Test Author',
    });
  });

  it('throws 422 when Authors Service returns 404', async () => {
    global.fetch = async () => new Response(null, {status: 404});

    const error = await expect(service.getAuthorById(999999)).to.be.rejected();

    expect(error.statusCode).to.equal(422);
    expect(error.message).to.equal('author_id 999999 does not exist');
  });

  it('throws 502 when Authors Service is unavailable', async () => {
    global.fetch = async () => {
      throw new Error('connection refused');
    };

    const error = await expect(service.getAuthorById(20)).to.be.rejected();

    expect(error.statusCode).to.equal(502);
    expect(error.message).to.equal('Authors Service is unavailable');
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
      const error = await expect(service.getAuthorById(20)).to.be.rejected();
      expect(error.statusCode).to.equal(504);
      expect(Date.now() - startedAt).to.be.lessThan(1000);
    } finally {
      configurable.requestTimeoutMs = 5000;
    }
  });
});
