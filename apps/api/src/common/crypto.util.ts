import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

/**
 * 敏感配置加密（AES-256-GCM）—— 对应需求文档 7.3「加密存储」/ M9 支付配置。
 * 密钥从 SETTINGS_ENCRYPTION_KEY 派生（scrypt）。存储格式：salt:iv:authTag:ciphertext（hex）。
 */

function deriveKey(secret: string, salt: Buffer): Buffer {
  return scryptSync(secret, salt, 32);
}

function getSecret(): string {
  const secret = process.env.SETTINGS_ENCRYPTION_KEY;
  if (!secret || secret.length < 16) {
    throw new Error('SETTINGS_ENCRYPTION_KEY 未配置或过短（需 ≥16 字符）');
  }
  return secret;
}

export function encryptSecret(plain: string): string {
  const secret = getSecret();
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = deriveKey(secret, salt);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [salt.toString('hex'), iv.toString('hex'), tag.toString('hex'), enc.toString('hex')].join(
    ':',
  );
}

export function decryptSecret(payload: string): string {
  const secret = getSecret();
  const [saltHex, ivHex, tagHex, dataHex] = payload.split(':');
  const key = deriveKey(secret, Buffer.from(saltHex, 'hex'));
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ]).toString('utf8');
}
