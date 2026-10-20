/* eslint-disable @typescript-eslint/naming-convention -- Preserve database field names. */
import {expect} from '@loopback/testlab';
import {ExternalIdentity} from '../../authentication/external-authentication-strategy';
import {ExternalUserProvisioner} from '../../services/external-user-provisioner';
import {ExternalIdentityRepository, UserRepository} from '../../repositories';

describe('ExternalUserProvisioner', () => {
  const identity: ExternalIdentity = {
    provider: 'arc',
    issuer: 'https://issuer.example',
    subject: 'stable-provider-subject',
    email: 'person@example.com',
    emailVerified: true,
  };

  function createProvisioner(
    options: {
      userFind?: () => Promise<unknown>;
      externalFind?: () => Promise<unknown>;
      externalCreate?: (data: Record<string, unknown>) => Promise<unknown>;
      userCreate?: (data: Record<string, unknown>) => Promise<unknown>;
      userById?: () => Promise<unknown>;
    } = {},
  ) {
    let committed = false;
    let rolledBack = false;
    let createdUser: Record<string, unknown> | undefined;
    let createdIdentity: Record<string, unknown> | undefined;
    const transaction = {
      commit: async () => {
        committed = true;
      },
      rollback: async () => {
        rolledBack = true;
      },
    };
    const userRepository = {
      findOne: options.userFind ?? (async () => null),
      findById: options.userById ?? (async () => ({user_id: 41, role: 'USER'})),
      create: async (data: Record<string, unknown>) => {
        createdUser = data;
        return options.userCreate
          ? options.userCreate(data)
          : {user_id: 42, email: data.email, role: data.role};
      },
    };
    const externalRepository = {
      findOne: options.externalFind ?? (async () => null),
      create: async (data: Record<string, unknown>) => {
        createdIdentity = data;
        return options.externalCreate ? options.externalCreate(data) : data;
      },
    };
    const dataSource = {
      beginTransaction: async () => transaction,
    };
    const provisioner = new ExternalUserProvisioner(
      userRepository as unknown as UserRepository,
      externalRepository as unknown as ExternalIdentityRepository,
      dataSource as never,
    );
    return {
      provisioner,
      transactionState: () => ({committed, rolledBack}),
      createdUser: () => createdUser,
      createdIdentity: () => createdIdentity,
    };
  }

  it('returns the existing BMS user for a known issuer and subject', async () => {
    const harness = createProvisioner({
      externalFind: async () => ({user_id: 41}),
    });
    const user = await harness.provisioner.resolve(identity);
    expect(user.user_id).to.equal(41);
    expect(harness.createdUser()).to.equal(undefined);
  });

  it('creates a new external account as USER only and commits both rows together', async () => {
    const harness = createProvisioner();
    const user = await harness.provisioner.resolve(identity);
    expect(user.role).to.equal('USER');
    expect(harness.createdUser()?.role).to.equal('USER');
    expect(harness.createdIdentity()?.issuer).to.equal(identity.issuer);
    expect(harness.transactionState()).to.deepEqual({
      committed: true,
      rolledBack: false,
    });
  });

  it('does not link a matching local email without explicit account linking', async () => {
    const harness = createProvisioner({
      userFind: async () => ({user_id: 7, email: identity.email}),
    });
    const error = await expect(
      harness.provisioner.resolve(identity),
    ).to.be.rejected();
    expect(error.statusCode).to.equal(409);
    expect(harness.createdUser()).to.equal(undefined);
  });

  it('rolls back uniqueness races and reuses the winning external mapping', async () => {
    let lookups = 0;
    const harness = createProvisioner({
      externalFind: async () => {
        lookups += 1;
        return lookups === 1 ? null : {user_id: 84};
      },
      externalCreate: async () => {
        const duplicate = new Error('duplicate');
        (duplicate as Error & {code: string}).code = '23505';
        throw duplicate;
      },
      userById: async () => ({user_id: 84, role: 'USER'}),
    });
    const user = await harness.provisioner.resolve(identity);
    expect(user.user_id).to.equal(84);
    expect(harness.transactionState()).to.deepEqual({
      committed: false,
      rolledBack: true,
    });
  });
});
