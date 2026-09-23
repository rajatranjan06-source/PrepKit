import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: string | { userId: string; email?: string; name?: string }): string {
  const data = typeof payload === 'string' ? { userId: payload } : payload;
  return jwt.sign(data, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): { userId: string; email?: string; name?: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; email?: string; name?: string };
  } catch {
    return null;
  }
}

export function getTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.substring(7);
}