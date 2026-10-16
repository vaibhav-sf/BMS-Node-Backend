import {expect} from '@loopback/testlab';
import {BooksApiService} from '../../services/books-api.service';

describe('BooksApiService upstream handling', () => {
  const service = new BooksApiService();
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('preserves an upstream 4xx status', async () => {
    global.fetch = async () => new Response('{}', {status: 403});
    const error = await expect(service.createBook({})).to.be.rejected();
    expect(error.statusCode).to.equal(403);
  });

  it('preserves an upstream 500 without exposing its body', async () => {
    global.fetch = async () =>
      new Response(JSON.stringify({error: {message: 'secret stack details'}}), {
        status: 500,
      });
    const error = await expect(service.createBook({})).to.be.rejected();
    expect(error.statusCode).to.equal(500);
    expect(error.message).to.not.containEql('secret stack details');
  });

  it('maps an unreachable Books service to 502', async () => {
    global.fetch = async () => {
      throw new Error('connection refused');
    };
    const error = await expect(service.createBook({})).to.be.rejected();
    expect(error.statusCode).to.equal(502);
  });

  it('maps a timed out Books service request to 504', async () => {
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
      const error = await expect(service.createBook({})).to.be.rejected();
      expect(error.statusCode).to.equal(504);
      expect(Date.now() - startedAt).to.be.lessThan(1000);
    } finally {
      configurable.requestTimeoutMs = 5000;
    }
  });
});
