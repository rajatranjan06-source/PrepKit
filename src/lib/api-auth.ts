import { cookies } from 'next/headers';
import { verifyToken, getTokenFromHeader } from './auth';

export async function getAuthenticatedUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('authorization');
  let token = getTokenFromHeader(authHeader);

  if (!token) {
    try {
      const cookieStore = cookies();
      token = cookieStore.get('prepkit_token')?.value || null;
    } catch {
      // ignore
    }
  }

  if (!token) return 'demo_user';

  const decoded = verifyToken(token);
  return decoded ? decoded.userId : 'demo_user';
}
