import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env.js';
import { BadRequestError } from '../utils/app-error.js';

interface InvitationEmailInput {
  to: string;
  workspaceName: string;
  invitedByName: string;
  acceptUrl: string;
}

interface AuthEmailInput {
  to: string;
  name: string;
  url: string;
}

interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface EmailSender {
  sendWorkspaceInvitation(input: InvitationEmailInput): Promise<void>;
  sendEmailVerification(input: AuthEmailInput): Promise<void>;
  sendPasswordReset(input: AuthEmailInput): Promise<void>;
  isConfigured(): boolean;
}

export class EmailService implements EmailSender {
  private transporter: Transporter | null = null;

  public async sendWorkspaceInvitation(input: InvitationEmailInput): Promise<void> {
    await this.send({
      to: input.to,
      subject: `Join ${input.workspaceName} on Zenith`,
      text: `${input.invitedByName} invited you to join ${input.workspaceName} on Zenith. Accept the invitation: ${input.acceptUrl}`,
      html: [
        `<p>${input.invitedByName} invited you to join <strong>${input.workspaceName}</strong> on Zenith.</p>`,
        `<p><a href="${input.acceptUrl}">Accept invitation</a></p>`,
      ].join(''),
    });
  }

  public async sendEmailVerification(input: AuthEmailInput): Promise<void> {
    await this.send({
      to: input.to,
      subject: 'Verify your Zenith email',
      text: `Hi ${input.name}, verify your email: ${input.url}`,
      html: `<p>Hi ${input.name},</p><p><a href="${input.url}">Verify your email</a></p>`,
    });
  }

  public async sendPasswordReset(input: AuthEmailInput): Promise<void> {
    await this.send({
      to: input.to,
      subject: 'Reset your Zenith password',
      text: `Hi ${input.name}, reset your password: ${input.url}`,
      html: `<p>Hi ${input.name},</p><p><a href="${input.url}">Reset your password</a></p>`,
    });
  }

  public isConfigured(): boolean {
    return Boolean(
      (env.RESEND_API_KEY && env.SMTP_FROM) ||
      (env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS && env.SMTP_FROM),
    );
  }

  private async send(message: EmailMessage): Promise<void> {
    if (env.RESEND_API_KEY && env.SMTP_FROM) {
      await this.sendWithResend(message);
      return;
    }

    await this.getTransporter().sendMail({
      from: env.SMTP_FROM,
      ...message,
    });
  }

  private async sendWithResend(message: EmailMessage): Promise<void> {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.SMTP_FROM,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
    });

    if (!response.ok) throw new BadRequestError('Email provider rejected the message');
  }

  private getTransporter(): Transporter {
    if (this.transporter) return this.transporter;
    if (!env.SMTP_HOST || !env.SMTP_PORT || !env.SMTP_USER || !env.SMTP_PASS || !env.SMTP_FROM) {
      throw new BadRequestError('Email service is not configured');
    }
    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
    return this.transporter;
  }
}
