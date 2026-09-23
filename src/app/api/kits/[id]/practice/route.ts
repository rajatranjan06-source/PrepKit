import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/api-auth';
import { getKitById, saveKitToDb } from '@/lib/db';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const existing = await getKitById(params.id, userId);
  if (!existing) {
    return NextResponse.json({ error: 'Kit not found or access denied' }, { status: 404 });
  }

  try {
    const body = await req.json();
    const { flashcardId, confidence } = body; // confidence: 1..5

    if (!flashcardId || typeof confidence !== 'number') {
      return NextResponse.json({ error: 'Invalid practice payload' }, { status: 400 });
    }

    const currentStats = existing.practiceStats || {};
    currentStats[flashcardId] = Math.min(5, Math.max(1, confidence));

    const updatedSavedKit = {
      ...existing,
      updatedAt: new Date().toISOString(),
      practiceStats: currentStats,
    };

    await saveKitToDb(updatedSavedKit);
    return NextResponse.json({ success: true, practiceStats: currentStats });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update practice stats' }, { status: 500 });
  }
}
