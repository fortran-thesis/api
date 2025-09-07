import { Resend } from "resend";
import { envOptions } from "../configs/environment";

let sendEmailImpl: (to: string, subject: string, html: string) => Promise<void>;

if (envOptions.isTest) {
  const transporter = require('nodemailer').createTransport({
    host: 'localhost',
    port: 1025, // MailHog default SMTP port
    secure: false,
    auth: null,
  });
  sendEmailImpl = async (to: string, subject: string, html: string) => {
    await transporter.sendMail({
      from: "Moldify Auto-email <onboarding@resend.dev>",
      to: [to],
      subject: subject,
      html: html,
    });
  };
} else {
  sendEmailImpl = async (to: string, subject: string, html: string) => {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Moldify Auto-email <onboarding@resend.dev>",
      to: [to],
      subject: subject,
      html: html,
    });
  };
}

export const sendEmail = sendEmailImpl;
