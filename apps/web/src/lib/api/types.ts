export interface ApiEnvelope<TData> {
  success: boolean;
  message: string;
  data: TData | null;
  errors: unknown[] | null;
  timestamp: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  role: string;
  isVerified: boolean;
  provider: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthPayload {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export interface ApiErrorDetails {
  message: string;
  status: number;
  errors: unknown[] | null;
}
