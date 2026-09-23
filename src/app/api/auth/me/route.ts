import { NextResponse } from 'next/server';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { getUserById } from '@/lib/db';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    let token = getTokenFromHeader(authHeader);

    if (!token) {
      const cookieStore = cookies();
      token = cookieStore.get('prepkit_token')?.value || null;
    }

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ authenticated: false, error: 'Session expired' }, { status: 401 });
    }

    const user = await getUserById(decoded.userId);
    const userId = user?.id || decoded.userId;
    const email = user?.email || decoded.email || 'user@example.com';
    const name = user?.name || decoded.name || email.split('@')[0] || 'User';

    return NextResponse.json({
      authenticated: true,
      user: { id: userId, email, name },
    });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
