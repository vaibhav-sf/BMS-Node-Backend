import {injectable} from '@loopback/core';

@injectable()
export class FakeBooksReferenceService {
  static hasReferences = false;
  static unavailable = false;

  async hasBooksForCategory(): Promise<boolean> {
    if (FakeBooksReferenceService.unavailable) {
      throw new Error('simulated Books service outage');
    }
    return FakeBooksReferenceService.hasReferences;
  }
}
