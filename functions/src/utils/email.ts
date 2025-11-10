import {envOptions} from "../configs/environment";
import * as nodemailer from "nodemailer";

let sendEmailImpl: (to: string, subject: string, html: string) => Promise<void>;

if (envOptions.isTest) {
  const transporter = nodemailer.createTransport({
    // Specify the transport type explicitly
    host: "localhost",
    port: 1025, // MailHog default SMTP port
    secure: false,
    auth: null,
  } as nodemailer.TransportOptions);
  sendEmailImpl = async (to: string, subject: string, html: string) => {
    await transporter.sendMail({
      from: "Moldify Auto-email <onboarding@resend.dev>",
      to: [to],
      subject: subject,
      html: html,
    });
  };
} else {
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: envOptions.moldifyEmail,
      pass: envOptions.moldifyPassword, // Use App Password for Gmail
    },
  });
  sendEmailImpl = async (to: string, subject: string, html: string) => {
    await transporter.sendMail({
      from: "Moldify Auto-email <onboarding@resend.dev>",
      to: [to],
      subject: subject,
      html: html,
    });
  };
}

export const sendEmail = sendEmailImpl;
