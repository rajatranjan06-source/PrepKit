import { KitSchema } from '../src/types/kit';

describe('Appendix A Kit JSON Schema Validation', () => {
  const validKitData = {
    source: {
      company: 'Acme Corp',
      company_url: 'https://example.com/acme',
      role: 'Senior Backend Engineer',
      location: 'Remote',
      jd_chars: 1250,
      researched_at: '2026-09-01T09:12:44Z',
      pages_used: ['https://example.com/acme/careers'],
    },
    company_brief: {
      summary: 'Leading cloud platform developer.',
      what_they_do: 'Enterprise backend solutions.',
      sources: ['https://example.com/acme/about'],
    },
    role: {
      title: 'Senior Backend Engineer',
      seniority: 'Senior',
      responsibilities: ['Architect microservices', 'Lead technical design'],
      requirements: [
        {
          id: 'r1',
          text: '5+ years experience with Node.js',
          kind: 'technical',
          priority: 'must',
        },
      ],
    },
    questions: [
      {
        id: 'q1',
        requirement_ids: ['r1'],
        category: 'technical',
        prompt: 'Explain event loop phase in Node.js',
        answer_outline: 'Timers, I/O callbacks, poll, check, close.',
        difficulty: 2,
      },
    ],
    flashcards: [
      {
        id: 'f1',
        front: 'What is process.nextTick()?',
        back: 'Defers execution until current operation completes.',
        requirement_ids: ['r1'],
      },
    ],
    schedule: {
      days_available: 5,
      days: [
        {
          day: 1,
          focus: 'Day 1: Technical Depth',
          question_ids: ['q1'],
          minutes: 60,
        },
      ],
    },
    coverage: {
      uncovered_requirement_ids: [],
      passes: 2,
    },
  };

  it('should validate a correctly formatted kit object matching Appendix A', () => {
    const parseResult = KitSchema.safeParse(validKitData);
    expect(parseResult.success).toBe(true);
  });

  it('should reject invalid difficulty values outside range 1..3', () => {
    const invalidKit = JSON.parse(JSON.stringify(validKitData));
    invalidKit.questions[0].difficulty = 5; // Invalid (> 3)
    const parseResult = KitSchema.safeParse(invalidKit);
    expect(parseResult.success).toBe(false);
  });

  it('should reject invalid requirement ID format (must match r<number>)', () => {
    const invalidKit = JSON.parse(JSON.stringify(validKitData));
    invalidKit.role.requirements[0].id = 'req_invalid';
    const parseResult = KitSchema.safeParse(invalidKit);
    expect(parseResult.success).toBe(false);
  });

  it('should reject invalid question category', () => {
    const invalidKit = JSON.parse(JSON.stringify(validKitData));
    invalidKit.questions[0].category = 'invalid-category';
    const parseResult = KitSchema.safeParse(invalidKit);
    expect(parseResult.success).toBe(false);
  });
});
