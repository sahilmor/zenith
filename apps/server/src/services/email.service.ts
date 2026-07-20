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

interface TemplateInput {
  title: string;
  preheader: string;
  greeting: string;
  intro: string;
  details: string[];
  ctaLabel: string;
  ctaUrl: string;
  footerNote: string;
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
    const email = this.renderTemplate({
      title: `Join ${input.workspaceName} on Zenith`,
      preheader: `${input.invitedByName} invited you to collaborate in ${input.workspaceName}.`,
      greeting: 'You have been invited',
      intro: `${input.invitedByName} invited you to join ${input.workspaceName} on Zenith.`,
      details: [
        'Zenith brings projects, tasks, documents, reporting, and collaboration into one workspace.',
        'Accept this invitation to join the workspace and start collaborating with your team.',
      ],
      ctaLabel: 'Accept invitation',
      ctaUrl: input.acceptUrl,
      footerNote: 'If you were not expecting this invitation, you can ignore this email.',
    });
    await this.send({
      to: input.to,
      subject: `Join ${input.workspaceName} on Zenith`,
      ...email,
    });
  }

  public async sendEmailVerification(input: AuthEmailInput): Promise<void> {
    const email = this.renderTemplate({
      title: 'Verify your Zenith email',
      preheader: 'Confirm your email address to secure your Zenith account.',
      greeting: `Hi ${input.name}`,
      intro:
        'Welcome to Zenith. Please verify your email address to finish setting up your account.',
      details: [
        'Verification helps keep your workspace secure and ensures account recovery emails reach you.',
        'This verification link expires for your protection.',
      ],
      ctaLabel: 'Verify email',
      ctaUrl: input.url,
      footerNote: 'If you did not create a Zenith account, you can safely ignore this email.',
    });
    await this.send({
      to: input.to,
      subject: 'Verify your Zenith email',
      ...email,
    });
  }

  public async sendPasswordReset(input: AuthEmailInput): Promise<void> {
    const email = this.renderTemplate({
      title: 'Reset your Zenith password',
      preheader: 'Use this secure link to reset your Zenith password.',
      greeting: `Hi ${input.name}`,
      intro: 'We received a request to reset the password for your Zenith account.',
      details: [
        'Click the button below to choose a new password. This link expires in 1 hour.',
        'If you did not request a password reset, no action is needed and your password will stay unchanged.',
      ],
      ctaLabel: 'Reset password',
      ctaUrl: input.url,
      footerNote: 'For your security, never share this email or reset link with anyone.',
    });
    await this.send({
      to: input.to,
      subject: 'Reset your Zenith password',
      ...email,
    });
  }

  public isConfigured(): boolean {
    return this.hasSmtpConfig() || this.hasResendConfig();
  }

  private async send(message: EmailMessage): Promise<void> {
    if (this.hasSmtpConfig()) {
      this.assertSmtpSenderIsProviderCompatible();
      await this.getTransporter().sendMail({
        from: env.SMTP_FROM,
        ...message,
      });
      return;
    }

    await this.sendWithResend(message);
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

    if (!response.ok) {
      const detail = await this.readProviderError(response);
      throw new BadRequestError(
        detail
          ? `Email provider rejected the message: ${detail}`
          : 'Email provider rejected the message',
      );
    }
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

  private hasSmtpConfig(): boolean {
    return Boolean(
      env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS && env.SMTP_FROM,
    );
  }

  private hasResendConfig(): boolean {
    return Boolean(env.RESEND_API_KEY && env.SMTP_FROM);
  }

  private assertSmtpSenderIsProviderCompatible(): void {
    if (!env.SMTP_HOST || !env.SMTP_FROM) return;
    const host = env.SMTP_HOST.toLowerCase();
    const fromAddress = this.extractEmailAddress(env.SMTP_FROM);
    if (host.includes('resend.com') && fromAddress.endsWith('@gmail.com')) {
      throw new BadRequestError(
        'Resend SMTP cannot send from gmail.com. Use a verified Resend sender domain or switch to Gmail SMTP with a Gmail app password.',
      );
    }
  }

  private extractEmailAddress(value: string): string {
    const trimmed = value.trim();
    const angleMatch = /^.+?\s*<([^<>]+)>$/.exec(trimmed);
    return (angleMatch?.[1] ?? trimmed).toLowerCase();
  }

  private renderTemplate(input: TemplateInput): Pick<EmailMessage, 'text' | 'html'> {
    const escaped = {
      title: this.escapeHtml(input.title),
      preheader: this.escapeHtml(input.preheader),
      greeting: this.escapeHtml(input.greeting),
      intro: this.escapeHtml(input.intro),
      ctaLabel: this.escapeHtml(input.ctaLabel),
      ctaUrl: this.escapeHtml(input.ctaUrl),
      footerNote: this.escapeHtml(input.footerNote),
    };
    const details = input.details.map((detail) => this.escapeHtml(detail));
    const detailHtml = details
      .map((detail, index) => {
        const margin = index === details.length - 1 ? '0' : '0 0 12px';
        return `<p style="margin:${margin};color:#475569;font-size:14px;line-height:1.7;">${detail}</p>`;
      })
      .join('');
    return {
      text: [
        input.title,
        '',
        input.greeting,
        '',
        input.intro,
        '',
        ...input.details.flatMap((detail) => [detail, '']),
        `${input.ctaLabel}: ${input.ctaUrl}`,
        '',
        input.footerNote,
        '',
        'Zenith',
      ].join('\n'),
      html: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <title>${escaped.title}</title>
  </head>
  <body style="margin:0;background:#f6f8fb;color:#0f172a;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escaped.preheader}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f8fb;margin:0;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 18px 45px rgba(15,23,42,0.08);">
            <tr>
              <td style="padding:28px 32px;background:#050816;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td>
                      <div style="display:inline-block;width:40px;height:40px;line-height:40px;text-align:center;border-radius:12px;background:linear-gradient(135deg,#34d399,#22d3ee);color:#050816;font-weight:700;font-size:16px;">Z</div>
                    </td>
                    <td align="right" style="color:#a7b3c7;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">Zenith</td>
                  </tr>
                </table>
                <h1 style="margin:26px 0 0;color:#ffffff;font-size:28px;line-height:1.22;font-weight:700;letter-spacing:-0.01em;">${escaped.title}</h1>
                <p style="margin:12px 0 0;color:#a7b3c7;font-size:15px;line-height:1.65;">${escaped.preheader}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0;color:#0f172a;font-size:16px;line-height:1.7;font-weight:700;">${escaped.greeting},</p>
                <p style="margin:14px 0 0;color:#334155;font-size:15px;line-height:1.75;">${escaped.intro}</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;border:1px solid #dbe4ef;border-radius:12px;background:#f8fafc;">
                  <tr>
                    <td style="padding:18px 20px;">
                      ${detailHtml}
                    </td>
                  </tr>
                </table>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 24px;">
                  <tr>
                    <td style="border-radius:12px;background:#059669;">
                      <a href="${escaped.ctaUrl}" style="display:inline-block;padding:14px 22px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;border-radius:12px;">${escaped.ctaLabel}</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0;color:#64748b;font-size:13px;line-height:1.7;">If the button does not work, copy and paste this link into your browser:</p>
                <p style="margin:8px 0 0;word-break:break-all;color:#0f766e;font-size:13px;line-height:1.7;"><a href="${escaped.ctaUrl}" style="color:#0f766e;text-decoration:underline;">${escaped.ctaUrl}</a></p>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 32px;border-top:1px solid #e2e8f0;background:#f8fafc;">
                <p style="margin:0;color:#64748b;font-size:12px;line-height:1.7;">${escaped.footerNote}</p>
                <p style="margin:12px 0 0;color:#94a3b8;font-size:12px;line-height:1.7;">Sent by Zenith. This is an automated message, so replies are not monitored.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
    };
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private async readProviderError(response: Response): Promise<string | null> {
    try {
      const body = (await response.json()) as {
        message?: unknown;
        error?: unknown;
        name?: unknown;
      };
      const message = typeof body.message === 'string' ? body.message : null;
      const error = typeof body.error === 'string' ? body.error : null;
      const name = typeof body.name === 'string' ? body.name : null;
      return [name, message ?? error].filter(Boolean).join(': ') || null;
    } catch {
      return null;
    }
  }
}
