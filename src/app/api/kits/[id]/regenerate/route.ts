import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/api-auth';
import { getKitById, saveKitToDb } from '@/lib/db';
import { regenerateKitSection } from '@/services/builder';
import { createLLMService } from '@/services/llm';
import { KitSchema } from '@/types/kit';

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
    const { section } = body; // 'company_brief' | 'technical' | 'behavioural' | 'system-design' | 'company-fit' | 'flashcards' | 'schedule'

    if (!section) {
      return NextResponse.json({ error: 'Section parameter required' }, { status: 400 });
    }

    const llmService = createLLMService();
    const regeneratedKit = await regenerateKitSection({
      kit: existing.kit,
      section,
      llmService,
    });

    const validatedKit = KitSchema.parse(regeneratedKit);

    const updatedSavedKit = {
      ...existing,
      updatedAt: new Date().toISOString(),
      kit: validatedKit,
    };

    await saveKitToDb(updatedSavedKit);
    return NextResponse.json({ success: true, savedKit: updatedSavedKit });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Section regeneration failed' },
      { status: 500 }
    );
  }
}
