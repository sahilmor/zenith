import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../../../config/env.js';
import type { JwtPayload } from '../../../types/auth.js';

const signToken = (payload: JwtPayload, secret: string, expiresIn: string): string =>
  jwt.sign(payload, secret, { expiresIn: expiresIn as NonNullable<SignOptions['expiresIn']> });

export class TokenService {
  public generateAccessToken(payload: JwtPayload): string {
    return signToken(payload, env.JWT_SECRET, env.ACCESS_TOKEN_EXPIRES_IN);
  }
  public generateRefreshToken(payload: JwtPayload): string {
    return signToken(payload, env.JWT_REFRESH_SECRET, env.REFRESH_TOKEN_EXPIRES_IN);
  }
  public verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  }
  public verifyRefreshToken(token: string): JwtPayload {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
  }
}
