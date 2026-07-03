import { ConflictError, UnauthorizedError } from '../../../utils/app-error.js';
import type { UserDocument } from '../../users/models/user.model.js';
import { UserRepository } from '../repositories/user.repository.js';
import type { LoginInput, SignupInput } from '../validation/auth.validation.js';
import { TokenService } from './token.service.js';

type AuthResult = { user: SafeUser; accessToken: string; refreshToken: string };
type SafeUser = {
  id: string;
  name: string;
  email: string;
  avatar: string | null | undefined;
  role: string;
  isVerified: boolean;
  provider: string;
  createdAt: Date;
  updatedAt: Date;
};

export class AuthService {
  public constructor(
    private readonly users = new UserRepository(),
    private readonly tokens = new TokenService(),
  ) {}

  public async signup(input: SignupInput): Promise<AuthResult> {
    const existingUser = await this.users.findByEmail(input.email);
    if (existingUser) throw new ConflictError('Email is already registered');
    const user = await this.users.create(input);
    return this.createAuthResult(user);
  }

  public async login(input: LoginInput): Promise<AuthResult> {
    const user = await this.users.findByEmail(input.email, true);
    if (!user) throw new UnauthorizedError('Invalid email or password');
    const passwordMatches = await user.comparePassword(input.password);
    if (!passwordMatches) throw new UnauthorizedError('Invalid email or password');
    return this.createAuthResult(user);
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
