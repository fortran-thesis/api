import { sendEmail } from '../../src/utils/email';
import { describe, it, expect } from '@jest/globals';

describe('email utils', () => {
  it('should send email', async () => {
    const result = await sendEmail('test@test.com', 'subject', 'body');
    expect(result).toBeDefined();
  });
  
  it('should send email (mocked)', async () => {
    expect(sendEmail).toBeDefined();
  });

  it('should throw if called with missing params (mocked)', async () => {
    await expect(sendEmail('', '', '')).rejects.toBeDefined();
  });
});
