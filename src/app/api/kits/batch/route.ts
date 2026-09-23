import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/api-auth';
import { saveKitToDb } from '@/lib/db';
import { runGenerationPipeline } from '@/services/pipeline';
import { createLLMService } from '@/services/llm';

export async function POST(req: Request) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { items } = body; // Array of { jobDescription, companyUrl, daysBeforeInterview }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Array of items required' }, { status: 400 });
    }

    const llmService = createLLMService();
    const generatedKits = [];
    const errors = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        const kit = await runGenerationPipeline({
          jobDescription: item.jobDescription,
          companyUrl: item.companyUrl,
          daysBeforeInterview: item.daysBeforeInterview || 5,
          llmService,
        });

        const kitId = `kit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const savedKit = {
          id: kitId,
          userId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          kit,
          practiceStats: {},
        };

        await saveKitToDb(savedKit);
        generatedKits.push({ id: kitId, company: kit.source.company, role: kit.source.role });
      } catch (err: any) {
        errors.push({ itemIndex: i, companyUrl: item.companyUrl, error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      generatedCount: generatedKits.length,
      kits: generatedKits,
      errors,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Batch creation failed' }, { status: 500 });
  }
}
