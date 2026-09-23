import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/api-auth';
import { getUserKits, saveKitToDb } from '@/lib/db';
import { CreateKitRequestSchema, KitSchema, SavedKit } from '@/types/kit';
import { runGenerationPipeline } from '@/services/pipeline';
import { createLLMService } from '@/services/llm';

// In-memory lock map to prevent duplicate concurrent generation jobs for same user & input
const activeJobs = new Set<string>();

export async function GET(req: Request) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const kits = await getUserKits(userId);
    return NextResponse.json({ kits });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch kits' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validated = CreateKitRequestSchema.parse(body);

    const jobLockKey = `${userId}:${validated.companyUrl}:${validated.jobDescription.substring(0, 50)}`;
    if (activeJobs.has(jobLockKey)) {
      return NextResponse.json(
        { error: 'A kit generation job is already in progress for this posting.' },
        { status: 409 }
      );
    }

    activeJobs.add(jobLockKey);

    try {
      const llmService = createLLMService();
      const generatedKit = await runGenerationPipeline({
        jobDescription: validated.jobDescription,
        companyUrl: validated.companyUrl,
        daysBeforeInterview: validated.daysBeforeInterview,
        llmService,
      });

      // Validate exact Appendix A structure
      const validatedKit = KitSchema.parse(generatedKit);

      const kitId = `kit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const savedKit: SavedKit = {
        id: kitId,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        kit: validatedKit,
        practiceStats: {},
      };

      await saveKitToDb(savedKit);

      return NextResponse.json({ success: true, kitId, kit: validatedKit });
    } finally {
      activeJobs.delete(jobLockKey);
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Kit generation failed' },
      { status: 400 }
    );
  }
}
