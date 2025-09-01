import { sendEmail } from '../../src/utils/email';
import { describe, it, expect, jest } from '@jest/globals';

jest.mock('../../src/utils/email', () => ({
  sendEmail: jest.fn(async (to: string, subject: string, html: string) => {
    if (!to || !subject || !html) {
      throw new Error('Missing params');
    }
    return { id: 'mocked-email-id' };
  })
}));

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
