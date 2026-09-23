import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/api-auth';
import { getKitById, saveKitToDb, deleteKitById } from '@/lib/db';
import { KitSchema, SavedKit } from '@/types/kit';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const savedKit = await getKitById(params.id, userId);
  if (!savedKit) {
    return NextResponse.json({ error: 'Kit not found or access denied' }, { status: 404 });
  }

  return NextResponse.json({ savedKit });
}

export async function PUT(
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
    const updatedKitData = KitSchema.parse(body.kit);

    const updatedSavedKit: SavedKit = {
      ...existing,
      updatedAt: new Date().toISOString(),
      kit: updatedKitData,
    };

    await saveKitToDb(updatedSavedKit);
    return NextResponse.json({ success: true, savedKit: updatedSavedKit });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Invalid kit structure' },
      { status: 400 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const success = await deleteKitById(params.id, userId);
  if (!success) {
    return NextResponse.json({ error: 'Kit not found or access denied' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
