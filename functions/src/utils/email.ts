import { Resend } from "resend";
import dotenv from "dotenv";
import { envOptions } from "../configs/environment";
dotenv.config();

let sendEmailImpl: (to: string, subject: string, html: string) => Promise<void>;

if (envOptions.useMailhog || process.env.USE_MAILHOG) {
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
  const resend = new Resend(process.env.RESEND_API_KEY);
  sendEmailImpl = async (to: string, subject: string, html: string) => {
    await resend.emails.send({
      from: "Moldify Auto-email <onboarding@resend.dev>",
      to: [to],
      subject: subject,
      html: html,
    });
  };
}

export const sendEmail = sendEmailImpl;
