import { regenerateKitSection } from '../src/services/builder';
import { Kit } from '../src/types/kit';
import { MockLLMService } from '../src/services/llm';

describe('Section Regeneration Edit Preservation', () => {
  const llmService = new MockLLMService();

  const initialKit: Kit = {
    source: {
      company: 'Acme',
      company_url: 'https://example.com',
      role: 'Backend Engineer',
      location: 'Remote',
      jd_chars: 500,
      researched_at: new Date().toISOString(),
      pages_used: [],
    },
    company_brief: {
      summary: 'Initial summary',
      what_they_do: 'Initial details',
      sources: [],
    },
    role: {
      title: 'Backend Engineer',
      seniority: 'Mid',
      responsibilities: ['Build APIs'],
      requirements: [
        { id: 'r1', text: 'Node.js', kind: 'technical', priority: 'must' },
      ],
    },
    questions: [
      {
        id: 'q_edited_1',
        requirement_ids: ['r1'],
        category: 'technical',
        prompt: 'USER EDITED PROMPT FOR QUESTION 1',
        answer_outline: 'USER EDITED OUTLINE',
        difficulty: 3,
        origin: 'edited',
        pinned: false,
      },
      {
        id: 'q_manual_2',
        requirement_ids: ['r1'],
        category: 'technical',
        prompt: 'USER MANUALLY ADDED QUESTION',
        answer_outline: 'USER MANUAL OUTLINE',
        difficulty: 2,
        origin: 'manual',
        pinned: true,
      },
      {
        id: 'q_gen_3',
        requirement_ids: ['r1'],
        category: 'technical',
        prompt: 'Old generated question to be replaced',
        answer_outline: 'Old outline',
        difficulty: 1,
        origin: 'generated',
        pinned: false,
      },
      {
        id: 'q_behavioural_4',
        requirement_ids: ['r1'],
        category: 'behavioural',
        prompt: 'Unrelated category question',
        answer_outline: 'Behavioural outline',
        difficulty: 1,
        origin: 'generated',
        pinned: false,
      },
    ],
    flashcards: [],
    schedule: {
      days_available: 3,
      days: [],
    },
    coverage: {
      uncovered_requirement_ids: [],
      passes: 1,
    },
  };

  it('should preserve edited, manual, and pinned questions during category regeneration', async () => {
    const updatedKit = await regenerateKitSection({
      kit: initialKit,
      section: 'technical',
      llmService,
    });

    const questionIds = updatedKit.questions.map(q => q.id);

    // Edited and manual/pinned technical questions MUST be preserved!
    expect(questionIds).toContain('q_edited_1');
    expect(questionIds).toContain('q_manual_2');

    // Unrelated category questions MUST be preserved!
    expect(questionIds).toContain('q_behavioural_4');

    // Verify content of preserved edited question remained intact
    const preservedEdited = updatedKit.questions.find(q => q.id === 'q_edited_1');
    expect(preservedEdited?.prompt).toBe('USER EDITED PROMPT FOR QUESTION 1');
  });
});
