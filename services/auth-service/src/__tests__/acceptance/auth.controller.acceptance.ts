import {randomUUID} from 'node:crypto';
import {Client, expect} from '@loopback/testlab';
import {AuthServiceApplication} from '../..';
import {UserRepository} from '../../repositories';
import {setupApplication} from './test-helper';

describe('AuthController authentication', () => {
  let app: AuthServiceApplication;
  let client: Client;
  let userRepository: UserRepository | undefined;

  const testEmails: string[] = [];
  const password = 'StrongPass!2026';

  function newTestEmail(): string {
    const email = `assignment15-${randomUUID()}@example.com`;
    testEmails.push(email);
    return email;
  }

  async function registerUser(email: string): Promise<void> {
    await client.post('/auth/register').send({email, password}).expect(201);
  }

  before(async () => {
    ({app, client} = await setupApplication());
    userRepository = await app.get<UserRepository>(
      'repositories.UserRepository',
    );
  });

  after(async () => {
    try {
      if (userRepository) {
        for (const email of new Set(testEmails)) {
          const user = await userRepository.findOne({
            where: {email},
          });

          if (user?.user_id !== undefined) {
            await userRepository.deleteById(user.user_id);
          }
        }
      }
    } finally {
      if (app) {
        await app.stop();
      }
    }
  });

  it('registers a user with HTTP 201 and returns only public fields', async () => {
    const email = newTestEmail();

    const response = await client
      .post('/auth/register')
      .send({email: email.toUpperCase(), password})
      .expect(201);

    expect(response.body.email).to.equal(email);
    expect(response.body.role).to.equal('USER');
    expect(response.body.user_id).to.be.a.Number();
    expect(response.body.created_at).to.be.a.String();

    expect(
      Object.prototype.hasOwnProperty.call(response.body, 'passwordHash'),
    ).to.equal(false);

    expect(
      Object.prototype.hasOwnProperty.call(response.body, 'password'),
    ).to.equal(false);
  });

  it('rejects duplicate email registration with HTTP 409', async () => {
    const email = newTestEmail();

    await registerUser(email);

    await client.post('/auth/register').send({email, password}).expect(409);
  });

  it('rejects invalid registration data', async () => {
    await client
      .post('/auth/register')
      .send({
        email: 'not-an-email',
        password,
      })
      .expect(422);
  });

  it('does not allow a client to assign itself ADMIN', async () => {
    await client
      .post('/auth/register')
      .send({
        email: newTestEmail(),
        password,
        role: 'ADMIN',
      })
      .expect(422);
  });

  it('logs in successfully and returns a Bearer access token', async () => {
    const email = newTestEmail();

    await registerUser(email);

    const response = await client
      .post('/auth/login')
      .send({email, password})
      .expect(200);

    expect(response.body.access_token).to.be.a.String();
    expect(response.body.token_type).to.equal('Bearer');
    expect(response.body.expires_in).to.equal(900);
    expect(response.body.user.email).to.equal(email);
    expect(response.body.user.role).to.equal('USER');

    expect(
      Object.prototype.hasOwnProperty.call(response.body.user, 'passwordHash'),
    ).to.equal(false);
  });

  it('rejects an incorrect password with HTTP 401', async () => {
    const email = newTestEmail();

    await registerUser(email);

    await client
      .post('/auth/login')
      .send({
        email,
        password: 'IncorrectPassword!2026',
      })
      .expect(401);
  });

  it('rejects login for a nonexistent email with HTTP 401', async () => {
    await client
      .post('/auth/login')
      .send({
        email: newTestEmail(),
        password,
      })
      .expect(401);
  });
});
