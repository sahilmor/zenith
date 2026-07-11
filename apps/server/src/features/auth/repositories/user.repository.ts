import { UserModel, type UserDocument } from '../../users/models/user.model.js';
import type { SignupInput } from '../validation/auth.validation.js';

export class UserRepository {
  public async create(input: SignupInput): Promise<UserDocument> {
    return UserModel.create(input) as Promise<UserDocument>;
  }

  public async findByEmail(email: string, includePassword = false): Promise<UserDocument | null> {
    const query = UserModel.findOne({ email });
    if (includePassword) query.select('+password');
    return query.exec() as Promise<UserDocument | null>;
  }

  public async findById(id: string): Promise<UserDocument | null> {
    return UserModel.findById(id).exec() as Promise<UserDocument | null>;
  }

  public async findByVerificationToken(token: string): Promise<UserDocument | null> {
    return UserModel.findOne({
      emailVerificationToken: token,
      emailVerificationExpiresAt: { $gt: new Date() },
    })
      .select('+emailVerificationToken +emailVerificationExpiresAt')
      .exec() as Promise<UserDocument | null>;
  }

  public async findByPasswordResetToken(token: string): Promise<UserDocument | null> {
    return UserModel.findOne({
      passwordResetToken: token,
      passwordResetExpiresAt: { $gt: new Date() },
    })
      .select('+password +passwordResetToken +passwordResetExpiresAt')
      .exec() as Promise<UserDocument | null>;
  }

  public async save(user: UserDocument): Promise<UserDocument> {
    return user.save();
  }
}
