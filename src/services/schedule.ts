import { Requirement, Question, Schedule, ScheduleDay } from '../types/kit';

/**
 * Builds a prep schedule deterministically in pure application code.
 * Rules:
 * - Exactly matches requested `daysAvailable`.
 * - Ensures every MUST-have requirement appears somewhere in the schedule.
 * - Places harder (difficulty 3 & 2) and higher-priority material on earlier days.
 * - Uses strictly integer minutes.
 * - Guarantees every scheduled question_ids entry exists in `questions`.
 */
export function buildSchedule(
  requirements: Requirement[],
  questions: Question[],
  daysAvailable: number
): Schedule {
  const daysCount = Math.max(1, Math.min(90, Math.floor(daysAvailable)));

  if (questions.length === 0) {
    // Edge case: no questions available
    const days: ScheduleDay[] = [];
    for (let d = 1; d <= daysCount; d++) {
      days.push({
        day: d,
        focus: `Day ${d}: General Review`,
        question_ids: [],
        minutes: 45,
      });
    }
    return { days_available: daysCount, days };
  }

  // Create a map of requirement ID -> Requirement for quick lookup
  const reqMap = new Map<string, Requirement>();
  for (const r of requirements) {
    reqMap.set(r.id, r);
  }

  // Score questions for sorting:
  // Must-have requirements get higher priority
  // Higher difficulty (3 -> 2 -> 1) gets placed earlier
  const scoredQuestions = questions.map(q => {
    let mustCount = 0;
    let categoryWeight = 0;

    for (const rId of q.requirement_ids) {
      const r = reqMap.get(rId);
      if (r && r.priority === 'must') mustCount++;
    }

    if (q.category === 'system-design') categoryWeight = 4;
    else if (q.category === 'technical') categoryWeight = 3;
    else if (q.category === 'behavioural') categoryWeight = 2;
    else categoryWeight = 1;

    // Score formula: Must-have presence (100 pts) + Difficulty (10 pts) + Category weight (1 pt)
    const score = (mustCount > 0 ? 100 : 0) + (q.difficulty * 10) + categoryWeight;
    return { question: q, score };
  });

  // Sort questions descending by score so high priority & difficulty land earlier
  scoredQuestions.sort((a, b) => b.score - a.score);

  // Initialize days array
  const days: ScheduleDay[] = [];
  const dayBuckets: { questionIds: string[]; focusCategories: Set<string>; minutes: number }[] = Array.from(
    { length: daysCount },
    () => ({ questionIds: [], focusCategories: new Set(), minutes: 0 })
  );

  // Distribute questions across day buckets round-robin or bucket-loaded
  scoredQuestions.forEach(({ question }, index) => {
    const bucketIndex = index % daysCount;
    dayBuckets[bucketIndex].questionIds.push(question.id);
    dayBuckets[bucketIndex].focusCategories.add(question.category);
  });

  // Build ScheduleDay objects with integer minutes and clear focus titles
  for (let d = 1; d <= daysCount; d++) {
    const bucket = dayBuckets[d - 1];
    const qCount = bucket.questionIds.length;

    // Calculate integer minutes (e.g. ~30 mins per question, min 30, max 180)
    let minutes = qCount === 0 ? 30 : Math.min(180, Math.max(45, qCount * 30));
    minutes = Math.round(minutes);

    // Determine focus description from categories present
    let focus = `Day ${d}: General Interview Prep`;
    if (bucket.focusCategories.size > 0) {
      const cats = Array.from(bucket.focusCategories).map(c => {
        if (c === 'system-design') return 'System Design';
        if (c === 'technical') return 'Technical Depth';
        if (c === 'behavioural') return 'Behavioural & STAR';
        return 'Company Fit';
      });
      focus = `Day ${d}: ${cats.join(' & ')}`;
    }

    days.push({
      day: d,
      focus,
      question_ids: bucket.questionIds,
      minutes,
    });
  }

  // Ensure every must-have requirement appears in at least one scheduled day's question_ids
  const mustReqs = requirements.filter(r => r.priority === 'must');
  const scheduledQuestionIds = new Set(days.flatMap(d => d.question_ids));

  for (const mustReq of mustReqs) {
    // Find a question that covers this mustReq
    const matchingQ = questions.find(q => q.requirement_ids.includes(mustReq.id));
    if (matchingQ && !scheduledQuestionIds.has(matchingQ.id)) {
      // Add to Day 1
      days[0].question_ids.push(matchingQ.id);
      scheduledQuestionIds.add(matchingQ.id);
    }
  }

  return {
    days_available: daysCount,
    days,
  };
}
