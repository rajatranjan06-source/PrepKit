import { Kit, Question, CompanyBrief, Schedule, Flashcard } from '../types/kit';
import { LLMService, safeParseLLMJson } from './llm';
import { buildSchedule } from './schedule';

export interface RegenerateSectionParams {
  kit: Kit;
  section: 'company_brief' | 'technical' | 'behavioural' | 'system-design' | 'company-fit' | 'flashcards' | 'schedule';
  llmService: LLMService;
}

/**
 * Regenerates a single section of a Kit while preserving user edits,
 * manual additions, and pinned items.
 */
export async function regenerateKitSection({
  kit,
  section,
  llmService,
}: RegenerateSectionParams): Promise<Kit> {
  const updatedKit: Kit = JSON.parse(JSON.stringify(kit));

  if (section === 'company_brief') {
    // Regenerate Company Brief only
    const prompt = `
GENERATE_COMPANY_BRIEF
Company: ${kit.source.company}
Role: ${kit.source.role}
Retrieved web sources: ${JSON.stringify(kit.company_brief.sources)}

Generate an updated company brief JSON object:
{
  "company_brief": {
    "summary": "Updated concise summary...",
    "what_they_do": "Updated core business and tech focus...",
    "sources": ${JSON.stringify(kit.company_brief.sources)}
  }
}
`;
    const response = await llmService.chat([
      { role: 'system', content: 'Output strictly valid JSON.' },
      { role: 'user', content: prompt }
    ]);
    const parsed = safeParseLLMJson<{ company_brief: CompanyBrief }>(response.content);
    if (parsed.company_brief) {
      updatedKit.company_brief = {
        ...parsed.company_brief,
        sources: parsed.company_brief.sources || kit.company_brief.sources,
      };
    }
    return updatedKit;
  }

  if (section === 'schedule') {
    // Regenerate schedule deterministically using existing questions and requirements
    updatedKit.schedule = buildSchedule(
      updatedKit.role.requirements,
      updatedKit.questions,
      updatedKit.schedule.days_available
    );
    return updatedKit;
  }

  if (section === 'flashcards') {
    // Regenerate unpinned/generated flashcards only
    const preservedFlashcards = updatedKit.flashcards.filter(f => f.origin === 'edited' || f.origin === 'manual' || f.pinned);
    
    const prompt = `
GENERATE_FLASHCARDS
Role: ${kit.role.title}
Requirements: ${JSON.stringify(kit.role.requirements, null, 2)}

Generate updated flashcards for interview preparation. Return JSON:
{
  "flashcards": [
    {
      "id": "f_new_1",
      "front": "Question/Prompt...",
      "back": "Key Answer Concept...",
      "requirement_ids": ["r1"]
    }
  ]
}
`;
    const response = await llmService.chat([
      { role: 'system', content: 'Output strictly valid JSON.' },
      { role: 'user', content: prompt }
    ]);
    const parsed = safeParseLLMJson<{ flashcards: Flashcard[] }>(response.content);
    if (parsed.flashcards && Array.isArray(parsed.flashcards)) {
      const newFlashcards: Flashcard[] = parsed.flashcards.map((f, i) => ({
        id: `f_gen_${Date.now()}_${i + 1}`,
        front: f.front,
        back: f.back,
        requirement_ids: f.requirement_ids || [kit.role.requirements[0]?.id || 'r1'],
        origin: 'generated',
        pinned: false,
      }));
      updatedKit.flashcards = [...preservedFlashcards, ...newFlashcards];
    }
    return updatedKit;
  }

  // Question category regeneration ('technical', 'behavioural', 'system-design', 'company-fit')
  const categoryToRegenerate = section;
  
  // Separate questions into:
  // 1. Questions in other categories (MUST BE PRESERVED COMPLETELY)
  // 2. Questions in this category that are edited, manual, or pinned (MUST BE PRESERVED)
  // 3. Unpinned 'generated' questions in this category (will be replaced)
  const unrelatedQuestions = updatedKit.questions.filter(q => q.category !== categoryToRegenerate);
  const preservedCategoryQuestions = updatedKit.questions.filter(
    q => q.category === categoryToRegenerate && (q.origin === 'edited' || q.origin === 'manual' || q.pinned)
  );

  const prompt = `
GENERATE_CATEGORY_QUESTIONS
Category: ${categoryToRegenerate}
Role Title: ${kit.role.title}
Seniority: ${kit.role.seniority}
Requirements: ${JSON.stringify(kit.role.requirements, null, 2)}
Company Brief: ${JSON.stringify(kit.company_brief)}

Generate high-quality ${categoryToRegenerate} interview questions.
Return JSON:
{
  "questions": [
    {
      "id": "q_new_1",
      "requirement_ids": ["r1"],
      "category": "${categoryToRegenerate}",
      "prompt": "Question prompt...",
      "answer_outline": "Key points...",
      "difficulty": 2
    }
  ]
}
`;

  const response = await llmService.chat([
    { role: 'system', content: 'Output strictly valid JSON.' },
    { role: 'user', content: prompt }
  ]);
  const parsed = safeParseLLMJson<{ questions: Question[] }>(response.content);

  if (parsed.questions && Array.isArray(parsed.questions)) {
    const newlyGeneratedQuestions: Question[] = parsed.questions.map((q, i) => ({
      id: `q_regen_${categoryToRegenerate.replace('-', '_')}_${Date.now()}_${i + 1}`,
      requirement_ids: q.requirement_ids || [kit.role.requirements[0]?.id || 'r1'],
      category: categoryToRegenerate as any,
      prompt: q.prompt,
      answer_outline: q.answer_outline,
      difficulty: Math.min(3, Math.max(1, q.difficulty || 2)),
      origin: 'generated',
      pinned: false,
    }));

    // Recombine preserved questions and new category questions
    updatedKit.questions = [
      ...unrelatedQuestions,
      ...preservedCategoryQuestions,
      ...newlyGeneratedQuestions,
    ];

    // Rebuild study schedule so all scheduled questions remain valid
    updatedKit.schedule = buildSchedule(
      updatedKit.role.requirements,
      updatedKit.questions,
      updatedKit.schedule.days_available
    );
  }

  return updatedKit;
}
