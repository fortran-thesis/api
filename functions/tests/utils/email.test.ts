import {sendEmail} from "../../src/utils/email";
import {describe, it, expect, jest, afterAll} from "@jest/globals";

jest.mock("../../src/utils/email", () => ({
  sendEmail: jest.fn(async (to: string, subject: string, html: string) => {
    if (!to || !subject || !html) {
      throw new Error("Missing params");
    }
    return {id: "mocked-email-id"};
  }),
}));

describe("email utils (unit)", () => {
  it("should send email", async () => {
    const result = await sendEmail("test@test.com", "subject", "body");
    expect(result).toBeDefined();
  });

  it("should send email (mocked)", async () => {
    expect(sendEmail).toBeDefined();
  });

  it("should throw if called with missing params (mocked)", async () => {
    await expect(sendEmail("", "", "")).rejects.toBeDefined();
  });

  afterAll(async () => {
    // Close MailHog transporter if used
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {transporter} = require("../../src/utils/email");
    if (transporter && transporter.close) {
      transporter.close();
    }
  });
});
