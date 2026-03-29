import { User, Role } from '@prisma/client';

// ─── JWT Payload Types ───────────────────────────────────────

export interface AuthTokenPayload {
  email: string;
  sub: string;
  id: string;
  role: string;
  sessionId: string;
}

export interface TempTokenPayload {
  sub: string;
  id: string;
  purpose: '2fa-login';
}

// ─── Response Types ──────────────────────────────────────────

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: string;
  twoFactorEnabled: boolean;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: UserResponse;
}

export interface LoginResult {
  requiresTwoFactor: boolean;
  tempToken?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: UserResponse;
}

// ─── Request Types ───────────────────────────────────────────

export interface OAuthRecord {
  email: string;
  name: string;
  role?: string;
}

export interface AuthenticatedUser {
  email: string;
  name: string;
  id: string;
  role: string;
  sessionId: string;
  twoFactorEnabled: boolean;
}

// ─── User with role relation ─────────────────────────────────

export type UserWithRole = User & { role: Role };

// ─── Helpers ─────────────────────────────────────────────────

export function toUserResponse(user: UserWithRole): UserResponse {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role.name,
    twoFactorEnabled: user.twoFactorEnabled,
  };
}
