/* eslint-disable @typescript-eslint/naming-convention -- Preserve database column names. */
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';
import {HttpErrors} from '@loopback/rest';
import {OAuthAuthorizationTransaction} from './external-authentication-strategy';
import {OAuthTransactionRepository} from '../repositories';
function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function encryptionKey(): Buffer {
  const configuredKey = process.env.OAUTH_TRANSACTION_ENCRYPTION_KEY;
  if (!configuredKey || !/^[0-9a-fA-F]{64}$/.test(configuredKey)) {
    throw new Error('OAuth transaction encryption is not configured.');
  }
  return Buffer.from(configuredKey, 'hex');
}

export function assertOAuthEncryptionConfigured(): void {
  encryptionKey();
}

function encrypt(value: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(value, 'utf8'),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), ciphertext]
    .map(part => part.toString('base64url'))
    .join('.');
}

function decrypt(value: string, key: Buffer): string {
  const [ivValue, tagValue, ciphertextValue, extra] = value.split('.');
  if (!ivValue || !tagValue || !ciphertextValue || extra !== undefined) {
    throw new Error('OAuth transaction data is invalid.');
  }
  const decipher = createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(ivValue, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}
/**
 * Creates a high-entropy token for binding an OAuth transaction to a browser.
 * The caller must send it only in a Secure, HttpOnly cookie.
 */
export function createBrowserBinding(): string {
  return randomBytes(32).toString('base64url');
}
export class OAuthTransactionStore {
  constructor(private readonly repository: OAuthTransactionRepository) {}
  async save(
    provider: string,
    transaction: OAuthAuthorizationTransaction,
    browserBinding: string,
  ): Promise<void> {
    const key = encryptionKey();
    if (
      !provider.trim() ||
      !transaction.state ||
      !transaction.nonce ||
      !transaction.codeVerifier ||
      !browserBinding ||
      transaction.expiresAt <= Date.now()
    ) {
      throw new Error('Invalid OAuth transaction input.');
    }
    await this.repository.deleteAll({expires_at: {lt: new Date()}});
    await this.repository.create({
      state_hash: sha256(transaction.state),
      provider,
      nonce: encrypt(transaction.nonce, key),
      code_verifier: encrypt(transaction.codeVerifier, key),
      browser_binding_hash: sha256(browserBinding),
      expires_at: new Date(transaction.expiresAt),
    });
  }
  async consume(
    provider: string,
    state: string,
    browserBinding: string,
  ): Promise<OAuthAuthorizationTransaction> {
    const key = encryptionKey();
    if (
      !provider.trim() ||
      !state ||
      state.length > 512 ||
      !browserBinding ||
      browserBinding.length > 512
    ) {
      throw new HttpErrors.BadRequest('Invalid or expired OAuth transaction.');
    }
    const stateHash = sha256(state);
    const bindingHash = sha256(browserBinding);
    // Consume with one conditional database update. If two callbacks race,
    // only one can update a row whose consumed_at is still NULL.
    const consumedAt = new Date();
    const result = await this.repository.updateAll(
      {consumed_at: consumedAt},
      {
        state_hash: stateHash,
        provider,
        browser_binding_hash: bindingHash,
        consumed_at: {eq: null},
        expires_at: {gt: consumedAt},
      },
    );
    if (result.count !== 1) {
      throw new HttpErrors.BadRequest(
        'Invalid, expired, or already-used OAuth transaction.',
      );
    }
    const transaction = await this.repository.findOne({
      where: {
        state_hash: stateHash,
        provider,
        browser_binding_hash: bindingHash,
      },
    });
    if (!transaction) {
      throw new HttpErrors.BadRequest('Invalid or expired OAuth transaction.');
    }
    return {
      state,
      nonce: decrypt(transaction.nonce, key),
      codeVerifier: decrypt(transaction.code_verifier, key),
      expiresAt: transaction.expires_at.getTime(),
    };
  }
}
