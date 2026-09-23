import { NextResponse } from 'next/server';
import { hashPassword, generateToken } from '@/lib/auth';
import { saveUserToDb, getUserByEmail } from '@/lib/db';
import { RegisterRequestSchema } from '@/types/kit';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = RegisterRequestSchema.parse(body);

    const existing = await getUserByEmail(validated.email);
    if (existing) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(validated.password);
    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    const user = {
      id: userId,
      email: validated.email.toLowerCase(),
      name: validated.name,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
    };

    await saveUserToDb(user);
    const token = generateToken({ userId: user.id, email: user.email, name: user.name });

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name },
      token,
    });

    response.cookies.set('prepkit_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Registration failed' },
      { status: 400 }
    );
  }
}
