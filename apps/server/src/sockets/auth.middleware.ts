import { UserRepository } from '../features/auth/repositories/user.repository.js';
import { TokenService } from '../features/auth/services/token.service.js';
import type { AuthenticatedSocket } from './socket.types.js';

const tokens = new TokenService();
const users = new UserRepository();

const extractToken = (socket: AuthenticatedSocket): string | null => {
  const authToken = socket.handshake.auth.token;
  if (typeof authToken === 'string' && authToken.trim()) return authToken;

  const authorization = socket.handshake.headers.authorization;
  if (authorization?.startsWith('Bearer ')) return authorization.slice(7);
  return null;
};

export const authenticateSocket = async (
  socket: AuthenticatedSocket,
  next: (error?: Error) => void,
): Promise<void> => {
  try {
    const token = extractToken(socket);
    if (!token) {
      next(new Error('Access token is required'));
      return;
    }
    const payload = tokens.verifyAccessToken(token);
    const user = await users.findById(payload.userId);
    if (!user) {
      next(new Error('User no longer exists'));
      return;
    }
    socket.data.user = { ...payload, id: user.id, _id: user._id };
    socket.data.profile = {
      name: user.name,
      email: user.email,
      avatar: user.avatar ?? null,
    };
    socket.data.joinedRooms = new Set();
    socket.data.roomWorkspaceIds = new Map();
    next();
  } catch {
    next(new Error('Invalid or expired access token'));
  }
};
