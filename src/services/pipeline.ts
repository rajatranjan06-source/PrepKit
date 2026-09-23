import { Kit, Requirement, Question, Flashcard, CompanyBrief, Role } from '../types/kit';
import { LLMService, safeParseLLMJson } from './llm';
import { crawlWebsite, extractTextFromPages } from './crawler';
import { runCoverageCheckAndGapFill } from './coverage';
import { buildSchedule } from './schedule';

export interface PipelineProgressCallback {
  (stage: string, percent: number, details?: string): void;
}

export interface PipelineOptions {
  jobDescription: string;
  companyUrl: string;
  daysBeforeInterview: number;
  llmService: LLMService;
  onProgress?: PipelineProgressCallback;
}

/**
 * Runs the full multi-step research, extraction, generation, coverage loop,
 * and schedule allocation pipeline.
 */
export async function runGenerationPipeline(options: PipelineOptions): Promise<Kit> {
  const { jobDescription, companyUrl, daysBeforeInterview, llmService, onProgress } = options;

  const notify = (stage: string, percent: number, details?: string) => {
    if (onProgress) onProgress(stage, percent, details);
  };

  // Stage 1: Extract job requirements
  notify('Extracting job requirements', 10, 'Analyzing job title, seniority, responsibilities & requirement priorities...');
  
  const extractPrompt = `
EXTRACT_REQUIREMENTS
You are a precise job description analyzer. Extract key information from this Job Posting text:
"""
${jobDescription.substring(0, 15000)}
"""

STRICT RULES:
1. Extract title, seniority (e.g. Junior, Mid, Senior, Lead, Staff), and responsibilities.
2. Give every requirement a stable ID starting with r1, r2, r3...
3. Priority MUST be marked as "must" or "nice" based strictly on wording in the posting (e.g. "Required", "Must have" => "must"; "Bonus", "Plus", "Nice to have" => "nice"). Never invent requirements!
4. Classify requirement kind as "technical", "behavioural", or "domain".

Return JSON:
{
  "role": {
    "title": "Software Engineer",
    "seniority": "Senior",
    "responsibilities": ["Develop services...", "Code review..."],
    "requirements": [
      {
        "id": "r1",
        "text": "5+ years of Node.js experience",
        "kind": "technical",
        "priority": "must"
      }
    ]
  }
}
`;

  console.log("About to call LLM for extraction");
  const extractRes = await llmService.chat([
    { role: 'system', content: 'Output strictly valid JSON.' },
    { role: 'user', content: extractPrompt }
  ]);
  console.log("LLM extract response:", extractRes.content.substring(0, 200));
  const parsedExtract = safeParseLLMJson<{ role: Role }>(extractRes.content);
  const role: Role = parsedExtract.role || {
    title: 'Software Engineer',
    seniority: 'Mid-Senior',
    responsibilities: ['Build software applications', 'Collaborate with team'],
    requirements: [
      { id: 'r1', text: 'Software development experience', kind: 'technical', priority: 'must' }
    ]
  };

  // Stage 2: Crawling company website
  notify('Crawling company website', 25, `Scraping ${companyUrl} & ranking relevant internal pages...`);
  let crawlResult;
  try {
    crawlResult = await crawlWebsite(companyUrl);
    console.log("Crawl result:", crawlResult.pages.length, "pages, failed:", crawlResult.failedUrls.length);
  } catch (err) {
    console.error("Crawl error:", err);
    throw err;
  }
  const websiteText = extractTextFromPages(crawlResult.pages);
  const pagesUsed = crawlResult.pages.map(p => p.url);
  if (pagesUsed.length === 0) pagesUsed.push(companyUrl);

  // Stage 3 & 4: Finding hiring process info & public interview discussion
  notify('Finding hiring-process information & public discussion', 40, 'Extracting hiring process insights & public interview reviews...');
  
  const briefPrompt = `
GENERATE_COMPANY_BRIEF
Job Posting: ${role.title} at ${companyUrl}
Retrieved Web Content:
${websiteText.substring(0, 10000)}

Public Interview References:
${JSON.stringify(crawlResult.publicDiscussion || [])}

Generate an accurate company brief based ONLY on retrieved evidence. If research is sparse, state so honestly.
Return JSON:
{
  "company_brief": {
    "summary": "Summary of company culture, products, and mission...",
    "what_they_do": "Core business and technical products...",
    "sources": ${JSON.stringify(pagesUsed)}
  }
}
`;

  const briefRes = await llmService.chat([
    { role: 'system', content: 'Output strictly valid JSON.' },
    { role: 'user', content: briefPrompt }
  ]);
  const parsedBrief = safeParseLLMJson<{ company_brief: CompanyBrief }>(briefRes.content);
  const companyBrief: CompanyBrief = parsedBrief.company_brief || {
    summary: `Company overview for ${companyUrl}.`,
    what_they_do: 'Technology development and services.',
    sources: pagesUsed,
  };

  // Stage 5: Generating categorized questions & flashcards
  notify('Generating categorized questions & flashcards', 60, 'Creating technical, behavioural, system design & company fit questions...');
  
  const categories: ('technical' | 'behavioural' | 'system-design' | 'company-fit')[] = [
    'technical', 'behavioural', 'system-design', 'company-fit'
  ];

  let questions: Question[] = [];
  let questionCounter = 1;

  for (const cat of categories) {
    const qPrompt = `
GENERATE_CATEGORY_QUESTIONS
Category: ${cat}
Role: ${role.title} (${role.seniority})
Requirements: ${JSON.stringify(role.requirements, null, 2)}
Company Brief: ${JSON.stringify(companyBrief)}

Generate 2-3 interview questions specifically for the "${cat}" category.
Each question MUST reference the requirement IDs (r1, r2, etc.) that it covers.
Difficulty MUST be an integer 1, 2, or 3.

Return JSON:
{
  "questions": [
    {
      "id": "q${questionCounter}",
      "requirement_ids": ["r1"],
      "category": "${cat}",
      "prompt": "Detailed question...",
      "answer_outline": "Expected answer points...",
      "difficulty": 2
    }
  ]
}
`;

    try {
      const qRes = await llmService.chat([
        { role: 'system', content: 'Output strictly valid JSON.' },
        { role: 'user', content: qPrompt }
      ]);
      const parsedQ = safeParseLLMJson<{ questions: Question[] }>(qRes.content);
      if (parsedQ.questions && Array.isArray(parsedQ.questions)) {
        for (const item of parsedQ.questions) {
          questions.push({
            id: `q${questionCounter++}`,
            requirement_ids: item.requirement_ids || [role.requirements[0]?.id || 'r1'],
            category: cat,
            prompt: item.prompt,
            answer_outline: item.answer_outline,
            difficulty: Math.min(3, Math.max(1, item.difficulty || 2)),
            origin: 'generated',
            pinned: false,
          });
        }
      }
    } catch (err) {
      console.warn(`Failed generating questions for category ${cat}:`, (err as Error).message);
    }
  }

  // Generate flashcards matching requirements
  const flashcardPrompt = `
GENERATE_FLASHCARDS
Role: ${role.title}
Requirements: ${JSON.stringify(role.requirements, null, 2)}

Generate 3-5 concise flashcards for quick revision.
Return JSON:
{
  "flashcards": [
    {
      "id": "f1",
      "front": "Question/Prompt...",
      "back": "Answer concept...",
      "requirement_ids": ["r1"]
    }
  ]
}
`;

  let flashcards: Flashcard[] = [];
  try {
    const fcRes = await llmService.chat([
      { role: 'system', content: 'Output strictly valid JSON.' },
      { role: 'user', content: flashcardPrompt }
    ]);
    const parsedFc = safeParseLLMJson<{ flashcards: Flashcard[] }>(fcRes.content);
    if (parsedFc.flashcards && Array.isArray(parsedFc.flashcards)) {
      flashcards = parsedFc.flashcards.map((f, idx) => ({
        id: `f${idx + 1}`,
        front: f.front,
        back: f.back,
        requirement_ids: f.requirement_ids || [role.requirements[0]?.id || 'r1'],
        origin: 'generated',
        pinned: false,
      }));
    }
  } catch (err) {
    console.warn('Flashcard generation fallback:', (err as Error).message);
    flashcards = role.requirements.map((r, idx) => ({
      id: `f${idx + 1}`,
      front: `Key Concept: ${r.text}`,
      back: `Demonstrate hands-on experience and core principles of ${r.text}.`,
      requirement_ids: [r.id],
      origin: 'generated',
      pinned: false,
    }));
  }

  // Stage 6: Checking requirement coverage
  notify('Checking requirement coverage', 75, 'Running deterministic gap analysis & second-pass generation for uncovered must-haves...');
  const coverageResult = await runCoverageCheckAndGapFill(
    role.requirements,
    questions,
    llmService,
    3
  );
  questions = coverageResult.updatedQuestions;

  // Stage 7: Building schedule
  notify('Building schedule', 90, `Allocating ${daysBeforeInterview} days study schedule deterministically...`);
  const schedule = buildSchedule(role.requirements, questions, daysBeforeInterview);

  // Stage 8: Saving kit
  notify('Saving kit', 100, 'Finalizing kit structure and saving to MongoDB database...');

  // Extract company name safely from URL or brief
  let companyName = 'Target Company';
  try {
    const u = new URL(companyUrl);
    const hostParts = u.hostname.replace(/^www\./, '').split('.');
    companyName = hostParts[0].charAt(0).toUpperCase() + hostParts[0].slice(1);
  } catch {
    // ignore
  }

  const kit: Kit = {
    source: {
      company: companyName,
      company_url: companyUrl,
      role: role.title,
      location: 'Remote / On-site',
      jd_chars: jobDescription.length,
      researched_at: new Date().toISOString(),
      pages_used: pagesUsed,
    },
    company_brief: companyBrief,
    role,
    questions,
    flashcards,
    schedule,
    coverage: coverageResult.coverage,
  };

  return kit;
}
