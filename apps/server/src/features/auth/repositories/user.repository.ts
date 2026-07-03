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
}
