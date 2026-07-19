import crypto from 'node:crypto';
import { env } from '../../../config/env.js';
import { EmailService, type EmailSender } from '../../../services/email.service.js';
import { BadRequestError, ConflictError, UnauthorizedError } from '../../../utils/app-error.js';
import { logger } from '../../../utils/logger.js';
import type { UserDocument } from '../../users/models/user.model.js';
import { UserRepository } from '../repositories/user.repository.js';
import type {
  ForgotPasswordInput,
  LoginInput,
  ResendVerificationInput,
  ResetPasswordInput,
  SignupInput,
  VerifyEmailInput,
} from '../validation/auth.validation.js';
import { TokenService } from './token.service.js';

interface AuthResult {
  user: SafeUser;
  accessToken: string;
  refreshToken: string;
}

interface SafeUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null | undefined;
  role: string;
  isVerified: boolean;
  provider: string;
  createdAt: Date;
  updatedAt: Date;
}

export class AuthService {
  public constructor(
    private readonly users = new UserRepository(),
    private readonly tokens = new TokenService(),
    private readonly email: EmailSender = new EmailService(),
  ) {}

  public async signup(input: SignupInput): Promise<AuthResult> {
    const existingUser = await this.users.findByEmail(input.email);
    if (existingUser) throw new ConflictError('Email is already registered');
    const user = await this.users.create(input);
    await this.issueVerificationEmail(user);
    return this.createAuthResult(user);
  }

  public async login(input: LoginInput): Promise<AuthResult> {
    const user = await this.users.findByEmail(input.email, true);
    if (!user) throw new UnauthorizedError('Invalid email or password');
    const passwordMatches = await user.comparePassword(input.password);
    if (!passwordMatches) throw new UnauthorizedError('Invalid email or password');
    return this.createAuthResult(user);
  }

  public async forgotPassword(input: ForgotPasswordInput): Promise<void> {
    const user = await this.users.findByEmail(input.email);
    if (!user) return;
    const { hashedToken, plainToken } = this.createSecureToken();
    user.passwordResetToken = hashedToken;
    user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await this.users.save(user);
    await this.sendAuthEmail('password_reset', user.email, () =>
      this.email.sendPasswordReset({
        to: user.email,
        name: user.name,
        url: `${env.APP_URL}/reset-password?token=${plainToken}`,
      }),
    );
  }

  public async resetPassword(input: ResetPasswordInput): Promise<void> {
    const user = await this.users.findByPasswordResetToken(this.hashToken(input.token));
    if (!user) throw new BadRequestError('Password reset link is invalid or expired');
    user.password = input.password;
    user.passwordResetToken = null;
    user.passwordResetExpiresAt = null;
    await this.users.save(user);
  }

  public async verifyEmail(input: VerifyEmailInput): Promise<AuthResult> {
    const user = await this.users.findByVerificationToken(this.hashToken(input.token));
    if (!user) throw new BadRequestError('Email verification link is invalid or expired');
    user.isVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpiresAt = null;
    await this.users.save(user);
    return this.createAuthResult(user);
  }

  public async resendVerification(input: ResendVerificationInput): Promise<void> {
    const user = await this.users.findByEmail(input.email);
    if (!user || user.isVerified) return;
    await this.issueVerificationEmail(user);
  }

  private async issueVerificationEmail(user: UserDocument): Promise<void> {
    const { hashedToken, plainToken } = this.createSecureToken();
    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.users.save(user);
    await this.sendAuthEmail('email_verification', user.email, () =>
      this.email.sendEmailVerification({
        to: user.email,
        name: user.name,
        url: `${env.APP_URL}/verify-email?token=${plainToken}`,
      }),
    );
  }

  private createSecureToken(): { plainToken: string; hashedToken: string } {
    const plainToken = crypto.randomBytes(32).toString('hex');
    return { plainToken, hashedToken: this.hashToken(plainToken) };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async sendAuthEmail(
    type: 'email_verification' | 'password_reset',
    _to: string,
    send: () => Promise<void>,
  ): Promise<void> {
    if (!this.email.isConfigured()) {
      logger.warn('Auth email not sent because email service is not configured', {
        type,
        required:
          'Set RESEND_API_KEY and SMTP_FROM, or set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM.',
      });
      if (env.NODE_ENV === 'development') {
        throw new BadRequestError(
          'Email service is not configured. Add RESEND_API_KEY and SMTP_FROM, or configure SMTP settings in apps/server/.env.',
        );
      }
      return;
    }
    await send();
  }

  public async refresh(refreshToken: string): Promise<AuthResult> {
    const payload = this.tokens.verifyRefreshToken(refreshToken);
    const user = await this.users.findById(payload.userId);
    if (!user) throw new UnauthorizedError('User no longer exists');
    return this.createAuthResult(user);
  }

  private createAuthResult(user: UserDocument): AuthResult {
    const payload = { userId: user.id, email: user.email, role: user.role };
    return {
      user: this.toSafeUser(user),
      accessToken: this.tokens.generateAccessToken(payload),
      refreshToken: this.tokens.generateRefreshToken(payload),
    };
  }

  private toSafeUser(user: UserDocument): SafeUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      isVerified: user.isVerified,
      provider: user.provider,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
