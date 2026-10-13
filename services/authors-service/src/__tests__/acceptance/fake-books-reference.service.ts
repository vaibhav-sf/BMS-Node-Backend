import {injectable} from '@loopback/core';

@injectable()
export class FakeBooksReferenceService {
  static hasReferences = false;
  static unavailable = false;

  async hasBooksForAuthor(): Promise<boolean> {
    if (FakeBooksReferenceService.unavailable) {
      throw new Error('simulated Books service outage');
    }
    return FakeBooksReferenceService.hasReferences;
  }
}
