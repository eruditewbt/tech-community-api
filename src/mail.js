"use strict";

const nodemailer = require("nodemailer");
const {
  CONTACT_TO_EMAIL,
  OUTLOOK_SMTP_USER,
  OUTLOOK_SMTP_PASS,
  MAIL_FROM_EMAIL,
  MAIL_FROM_NAME,
} = require("./config");

function isMailConfigured() {
  return Boolean(OUTLOOK_SMTP_USER && OUTLOOK_SMTP_PASS);
}

async function sendContactMail(input) {
  if (!isMailConfigured()) {
    return { sent: false, skipped: true, reason: "SMTP credentials are not configured." };
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.office365.com",
    port: 587,
    secure: false,
    auth: {
      user: OUTLOOK_SMTP_USER,
      pass: OUTLOOK_SMTP_PASS,
    },
  });

  const fromName = MAIL_FROM_NAME || "EruditeWBT Tech Community";
  const fromEmail = MAIL_FROM_EMAIL || OUTLOOK_SMTP_USER;
  const replyTo = input.email || fromEmail;

  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: CONTACT_TO_EMAIL,
    replyTo,
    subject: `[Tech Community] ${input.subject || "New contact message"}`,
    text: [
      `Name: ${input.name || ""}`,
      `Email: ${input.email || ""}`,
      `Source: ${input.source || ""}`,
      "",
      input.message || "",
    ].join("\n"),
  });

  return { sent: true };
}

module.exports = {
  isMailConfigured,
  sendContactMail,
};
