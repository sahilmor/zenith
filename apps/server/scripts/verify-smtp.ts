import 'dotenv/config';
import nodemailer from 'nodemailer';

const requiredKeys = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'] as const;

function getRequiredEnv(key: (typeof requiredKeys)[number]): string {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`${key} is required`);
  return value;
}

function extractEmailAddress(value: string): string {
  const trimmed = value.trim();
  const angleMatch = /^.+?\s*<([^<>]+)>$/.exec(trimmed);
  return (angleMatch?.[1] ?? trimmed).toLowerCase();
}

function assertProviderCompatibleSender(): void {
  const host = getRequiredEnv('SMTP_HOST').toLowerCase();
  const fromAddress = extractEmailAddress(getRequiredEnv('SMTP_FROM'));
  if (host.includes('resend.com') && fromAddress.endsWith('@gmail.com')) {
    throw new Error(
      'Resend SMTP cannot send from gmail.com. Use SMTP_FROM with a verified Resend domain, e.g. Zenith <no-reply@yourdomain.com>, or switch SMTP_HOST to smtp.gmail.com with a Gmail app password.',
    );
  }
}

async function main(): Promise<void> {
  const missing = requiredKeys.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    throw new Error(`Missing SMTP environment variables: ${missing.join(', ')}`);
  }
  assertProviderCompatibleSender();

  const port = Number(getRequiredEnv('SMTP_PORT'));
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('SMTP_PORT must be a positive integer');
  }

  const transporter = nodemailer.createTransport({
    host: getRequiredEnv('SMTP_HOST'),
    port,
    secure: port === 465,
    auth: {
      user: getRequiredEnv('SMTP_USER'),
      pass: getRequiredEnv('SMTP_PASS'),
    },
  });

  await transporter.verify();
  console.log('SMTP connection verified successfully.');

  const testRecipient = process.env.SMTP_TEST_TO?.trim();
  if (!testRecipient) {
    console.log('Set SMTP_TEST_TO to send a real test message.');
    return;
  }

  await transporter.sendMail({
    from: getRequiredEnv('SMTP_FROM'),
    to: testRecipient,
    subject: 'Zenith SMTP test',
    text: 'Zenith SMTP is configured correctly.',
    html: '<p>Zenith SMTP is configured correctly.</p>',
  });
  console.log(`SMTP test email sent to ${testRecipient}.`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'SMTP verification failed';
  console.error(message);
  process.exitCode = 1;
});
