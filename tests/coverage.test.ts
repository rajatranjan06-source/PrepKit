import { runCoverageCheckAndGapFill } from '../src/services/coverage';
import { Requirement, Question } from '../src/types/kit';
import { MockLLMService } from '../src/services/llm';

describe('Coverage Check & Gap Fill Service', () => {
  const llmService = new MockLLMService();

  const requirements: Requirement[] = [
    { id: 'r1', text: 'Node.js', kind: 'technical', priority: 'must' },
    { id: 'r2', text: 'MongoDB', kind: 'technical', priority: 'must' },
    { id: 'r3', text: 'GraphQL', kind: 'technical', priority: 'must' }, // Currently uncovered
    { id: 'r4', text: 'Docker', kind: 'domain', priority: 'nice' },
  ];

  const initialQuestions: Question[] = [
    {
      id: 'q1',
      requirement_ids: ['r1', 'r2'],
      category: 'technical',
      prompt: 'Node.js & MongoDB architecture question',
      answer_outline: 'Outline details',
      difficulty: 2,
      origin: 'generated',
      pinned: false,
    },
  ];

  it('should detect uncovered MUST-have requirements and perform gap filling', async () => {
    const result = await runCoverageCheckAndGapFill(requirements, initialQuestions, llmService, 3);
    
    // Gap check should generate missing question for r3
    expect(result.coverage.uncovered_requirement_ids).toEqual([]);
    expect(result.coverage.passes).toBeGreaterThan(0);
    
    // Check if new questions were generated covering r3
    const allCoveredReqs = new Set(result.updatedQuestions.flatMap(q => q.requirement_ids));
    expect(allCoveredReqs.has('r3')).toBe(true);
  });

  it('should return pass count = 1 if all must-have requirements are already covered', async () => {
    const completeQuestions: Question[] = [
      ...initialQuestions,
      {
        id: 'q2',
        requirement_ids: ['r3'],
        category: 'technical',
        prompt: 'GraphQL query optimization',
        answer_outline: 'Explain dataloader',
        difficulty: 2,
        origin: 'generated',
        pinned: false,
      },
    ];

    const result = await runCoverageCheckAndGapFill(requirements, completeQuestions, llmService, 3);
    expect(result.coverage.uncovered_requirement_ids).toEqual([]);
    expect(result.coverage.passes).toBe(1);
  });
});
