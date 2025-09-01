import { encrypt, decrypt } from '../../src/utils/encryption';
import { describe, it, expect } from '@jest/globals';

describe('encryption utils', () => {
  it('should encrypt and decrypt buffer', () => {
    const data = Buffer.from('secret');
    const { iv, encrypted } = encrypt(data);
    expect(iv).toBeDefined();
    expect(encrypted).toBeDefined();
    const decrypted = decrypt(encrypted, iv);
    expect(decrypted.toString()).toBe('secret');
  });
});
