import { buildSchedule } from '../src/services/schedule';
import { Requirement, Question } from '../src/types/kit';

describe('Schedule Allocation Service', () => {
  const sampleRequirements: Requirement[] = [
    { id: 'r1', text: '5+ years Node.js', kind: 'technical', priority: 'must' },
    { id: 'r2', text: 'MongoDB experience', kind: 'technical', priority: 'must' },
    { id: 'r3', text: 'React knowledge', kind: 'technical', priority: 'nice' },
  ];

  const sampleQuestions: Question[] = [
    {
      id: 'q1',
      requirement_ids: ['r1'],
      category: 'technical',
      prompt: 'Node.js performance question',
      answer_outline: 'Explain event loop',
      difficulty: 3,
      origin: 'generated',
      pinned: false,
    },
    {
      id: 'q2',
      requirement_ids: ['r2'],
      category: 'technical',
      prompt: 'MongoDB indexing question',
      answer_outline: 'Explain compound indexes',
      difficulty: 2,
      origin: 'generated',
      pinned: false,
    },
    {
      id: 'q3',
      requirement_ids: ['r3'],
      category: 'behavioural',
      prompt: 'Tell me about a time you led a team',
      answer_outline: 'STAR method',
      difficulty: 1,
      origin: 'generated',
      pinned: false,
    },
  ];

  it('should match the requested number of days exactly', () => {
    const daysRequested = 5;
    const schedule = buildSchedule(sampleRequirements, sampleQuestions, daysRequested);
    expect(schedule.days_available).toBe(5);
    expect(schedule.days).toHaveLength(5);
    expect(schedule.days.map(d => d.day)).toEqual([1, 2, 3, 4, 5]);
  });

  it('should support 1-day and 60-day schedule requests', () => {
    const schedule1 = buildSchedule(sampleRequirements, sampleQuestions, 1);
    expect(schedule1.days).toHaveLength(1);

    const schedule60 = buildSchedule(sampleRequirements, sampleQuestions, 60);
    expect(schedule60.days).toHaveLength(60);
  });

  it('should ensure all scheduled minutes are positive integers', () => {
    const schedule = buildSchedule(sampleRequirements, sampleQuestions, 7);
    for (const day of schedule.days) {
      expect(Number.isInteger(day.minutes)).toBe(true);
      expect(day.minutes).toBeGreaterThan(0);
    }
  });

  it('should include every MUST-have requirement in the scheduled question_ids', () => {
    const schedule = buildSchedule(sampleRequirements, sampleQuestions, 3);
    const scheduledQIds = new Set(schedule.days.flatMap(d => d.question_ids));

    // Must-have requirements r1 and r2 must be covered by scheduled questions
    const coveredReqIds = new Set<string>();
    for (const qId of scheduledQIds) {
      const q = sampleQuestions.find(item => item.id === qId);
      if (q) {
        q.requirement_ids.forEach(r => coveredReqIds.add(r));
      }
    }

    expect(coveredReqIds.has('r1')).toBe(true);
    expect(coveredReqIds.has('r2')).toBe(true);
  });

  it('should place harder/higher priority questions on earlier days', () => {
    const schedule = buildSchedule(sampleRequirements, sampleQuestions, 3);
    // Day 1 should have high difficulty questions (q1 with difficulty 3)
    expect(schedule.days[0].question_ids).toContain('q1');
  });

  it('should guarantee every question_ids entry in schedule refers to an existing question', () => {
    const schedule = buildSchedule(sampleRequirements, sampleQuestions, 4);
    const validQIds = new Set(sampleQuestions.map(q => q.id));
    for (const day of schedule.days) {
      for (const qId of day.question_ids) {
        expect(validQIds.has(qId)).toBe(true);
      }
    }
  });
});
