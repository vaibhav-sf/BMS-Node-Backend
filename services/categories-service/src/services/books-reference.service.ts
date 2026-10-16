import {BindingScope, injectable} from '@loopback/core';
import {HttpErrors} from '@loopback/rest';

@injectable({scope: BindingScope.SINGLETON})
export class BooksReferenceService {
  private readonly baseUrl =
    process.env.BOOKS_SERVICE_URL ?? 'http://127.0.0.1:3001';
  private readonly requestTimeoutMs = 5000;

  async hasBooksForCategory(categoryId: number): Promise<boolean> {
    const url = new URL('/books/count', this.baseUrl);
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const where = {category_id: categoryId};
    url.searchParams.set('where', JSON.stringify(where));

    let response: Response;
    try {
      response = await fetch(url, {
        signal: AbortSignal.timeout(this.requestTimeoutMs),
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new HttpErrors.GatewayTimeout('Books reference check timed out');
      }
      throw new HttpErrors.BadGateway('Books reference check is unavailable');
    }

    if (!response.ok) {
      throw new HttpErrors.BadGateway('Books reference check failed');
    }

    let body: {count?: unknown};
    try {
      body = (await response.json()) as {count?: unknown};
    } catch {
      throw new HttpErrors.BadGateway(
        'Books reference check returned invalid data',
      );
    }

    if (typeof body.count !== 'number' || !Number.isFinite(body.count)) {
      throw new HttpErrors.BadGateway(
        'Books reference check returned invalid data',
      );
    }
    return body.count > 0;
  }
}
