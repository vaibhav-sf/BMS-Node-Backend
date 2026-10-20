/* eslint-disable @typescript-eslint/naming-convention -- Preserve database column names. */
import {inject, injectable} from '@loopback/core';
import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import {hash} from 'bcryptjs';
import {randomBytes} from 'node:crypto';
import {ExternalIdentity} from '../authentication/external-authentication-strategy';
import {User} from '../models';
import {DbDataSourceDataSource} from '../datasources';
import {ExternalIdentityRepository, UserRepository} from '../repositories';

@injectable()
export class ExternalUserProvisioner {
  constructor(
    @repository(UserRepository)
    private readonly userRepository: UserRepository,
    @repository(ExternalIdentityRepository)
    private readonly externalIdentityRepository: ExternalIdentityRepository,
    @inject('datasources.DbDataSource')
    private readonly dataSource: DbDataSourceDataSource,
  ) {}

  async resolve(identity: ExternalIdentity): Promise<User> {
    if (!identity.emailVerified) {
      throw new HttpErrors.Unauthorized('External authentication failed.');
    }
    const existingIdentity = await this.externalIdentityRepository.findOne({
      where: {issuer: identity.issuer, subject: identity.subject},
    });
    if (existingIdentity) {
      return this.userRepository.findById(existingIdentity.user_id);
    }

    if (await this.userRepository.findOne({where: {email: identity.email}})) {
      throw new HttpErrors.Conflict(
        'An account already exists; explicit account linking is required.',
      );
    }

    const transaction = await this.dataSource.beginTransaction();
    try {
      const user = await this.userRepository.create(
        {
          email: identity.email,
          passwordHash: await hash(randomBytes(32).toString('base64url'), 12),
          role: 'USER',
        },
        {transaction},
      );
      await this.externalIdentityRepository.create(
        {
          user_id: user.user_id!,
          provider: identity.provider,
          issuer: identity.issuer,
          subject: identity.subject,
        },
        {transaction},
      );
      await transaction.commit();
      return user;
    } catch (error) {
      await transaction.rollback();
      const databaseError = error as {code?: string};
      if (databaseError.code === '23505') {
        const racedIdentity = await this.externalIdentityRepository.findOne({
          where: {issuer: identity.issuer, subject: identity.subject},
        });
        if (racedIdentity) {
          return this.userRepository.findById(racedIdentity.user_id);
        }
        throw new HttpErrors.Conflict('An account already exists.');
      }
      throw error;
    }
  }
}
