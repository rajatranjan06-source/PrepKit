import { Requirement, Question, Coverage } from '../types/kit';
import { LLMService, safeParseLLMJson } from './llm';

export interface CoverageCheckResult {
  coverage: Coverage;
  updatedQuestions: Question[];
}

/**
 * Checks requirement coverage deterministically in application code.
 * Identifies must-have requirements not referenced by any question.
 * Generates missing questions for uncovered requirements via second-pass generation.
 * Caps passes to prevent infinite loops and returns updated questions & coverage metrics.
 */
export async function runCoverageCheckAndGapFill(
  requirements: Requirement[],
  initialQuestions: Question[],
  llmService: LLMService,
  maxPasses = 3
): Promise<CoverageCheckResult> {
  let questions = [...initialQuestions];
  let currentPass = 1;
  let uncoveredMustIds: string[] = [];

  while (currentPass <= maxPasses) {
    // 1. Identify all must-have requirements
    const mustRequirements = requirements.filter(r => r.priority === 'must');
    
    // 2. Find which requirement IDs are referenced by at least one question
    const coveredReqIds = new Set<string>();
    for (const q of questions) {
      for (const reqId of q.requirement_ids) {
        coveredReqIds.add(reqId);
      }
    }

    // 3. Find uncovered must-have requirement IDs
    uncoveredMustIds = mustRequirements
      .filter(r => !coveredReqIds.has(r.id))
      .map(r => r.id);

    // If no uncovered must-haves, coverage check passes!
    if (uncoveredMustIds.length === 0) {
      break;
    }

    // 4. If we haven't reached max passes, trigger second-pass generation for uncovered must-haves
    if (currentPass < maxPasses) {
      const uncoveredReqs = requirements.filter(r => uncoveredMustIds.includes(r.id));
      
      const prompt = `
GENERATE_MISSING_QUESTIONS
You are an expert technical interviewer.
The following MUST-HAVE requirements currently have NO interview questions covering them:
${JSON.stringify(uncoveredReqs, null, 2)}

Generate at least one high-quality question for EACH uncovered requirement.
Return a JSON object:
{
  "questions": [
    {
      "id": "q_gap_<number>",
      "requirement_ids": ["${uncoveredReqs[0].id}"],
      "category": "technical",
      "prompt": "Detailed question prompt...",
      "answer_outline": "Key points for answer...",
      "difficulty": 2
    }
  ]
}
`;

      try {
        const response = await llmService.chat([
          { role: 'system', content: 'You are an interview kit assistant. Output strictly valid JSON.' },
          { role: 'user', content: prompt }
        ]);

        const parsed = safeParseLLMJson<{ questions: Question[] }>(response.content);
        if (parsed.questions && Array.isArray(parsed.questions)) {
          let nextQIndex = questions.length + 1;
          for (let i = 0; i < parsed.questions.length; i++) {
            const newQ = parsed.questions[i];
            // Ensure the generated question explicitly references the target uncovered requirement ID
            const targetReqId = uncoveredReqs[i % uncoveredReqs.length].id;
            const reqIds = (newQ.requirement_ids || []).filter(id => requirements.some(r => r.id === id));
            if (!reqIds.includes(targetReqId)) {
              reqIds.push(targetReqId);
            }

            questions.push({
              id: `q${nextQIndex++}`,
              requirement_ids: reqIds,
              category: newQ.category || 'technical',
              prompt: newQ.prompt || `Explain experience regarding requirement ${targetReqId}`,
              answer_outline: newQ.answer_outline || 'Key technical implementation details and principles.',
              difficulty: Math.min(3, Math.max(1, newQ.difficulty || 2)),
              origin: 'generated',
              pinned: false,
            });
          }
        }
      } catch (err) {
        console.warn(`Coverage gap-filling attempt failed on pass ${currentPass}:`, (err as Error).message);
        let nextQIndex = questions.length + 1;
        for (const req of uncoveredReqs) {
          questions.push({
            id: `q${nextQIndex++}`,
            requirement_ids: [req.id],
            category: req.kind === 'behavioural' ? 'behavioural' : 'technical',
            prompt: `Demonstrate your experience and proficiency with: ${req.text}`,
            answer_outline: `Explain background, concrete implementation examples, challenges faced, and outcomes related to ${req.text}.`,
            difficulty: 2,
            origin: 'generated',
            pinned: false,
          });
        }
      }
    }

    currentPass++;
  }

  // Final check of remaining uncovered must-have requirement IDs
  const coveredReqIdsFinal = new Set<string>();
  for (const q of questions) {
    for (const reqId of q.requirement_ids) {
      coveredReqIdsFinal.add(reqId);
    }
  }
  const finalUncoveredMustIds = requirements
    .filter(r => r.priority === 'must' && !coveredReqIdsFinal.has(r.id))
    .map(r => r.id);

  return {
    coverage: {
      uncovered_requirement_ids: finalUncoveredMustIds,
      passes: currentPass <= maxPasses ? currentPass : maxPasses,
    },
    updatedQuestions: questions,
  };
}
