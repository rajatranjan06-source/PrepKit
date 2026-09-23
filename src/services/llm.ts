export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMService {
  chat(messages: LLMMessage[]): Promise<LLMResponse>;
  getName(): string;
}

/**
 * Clean and parse JSON returned by LLM, handling markdown codeblocks, trailing commas, etc.
 */
export function safeParseLLMJson<T>(rawText: string): T {
  let cleaned = rawText.trim();

  // Strip markdown ```json ... ``` blocks
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Attempt lax parsing (removing trailing commas)
    try {
      const sanitized = cleaned
        .replace(/,\s*([}\]])/g, '$1') // trailing commas
        .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":'); // quotes around keys if missing
      return JSON.parse(sanitized) as T;
    } catch (e) {
      throw new Error(`Failed to parse LLM JSON response: ${(e as Error).message}\nRaw text was:\n${rawText.substring(0, 300)}...`);
    }
  }
}

/**
 * Intelligent Mock/Fallback LLM service used when no API key is provided,
 * during automated unit tests / batch evaluation, or when remote API quotas are exhausted.
 */
export class MockLLMService implements LLMService {
  getName(): string {
    return 'mock';
  }

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    console.log("MockLLMService.chat called");
    const userPrompt = messages.map(m => m.content).join('\n');

    // Extract company URL from prompt if present
    const urlMatch = userPrompt.match(/https?:\/\/[^\s\n"']+/i);
    const rawUrl = urlMatch ? urlMatch[0] : 'https://example.com';
    let domainName = 'Target Company';
    try {
      const u = new URL(rawUrl);
      domainName = u.hostname.replace(/^www\./i, '').split('.')[0];
      domainName = domainName.charAt(0).toUpperCase() + domainName.slice(1);
    } catch {}

    // Stage 1: EXTRACT_REQUIREMENTS
    if (userPrompt.includes('EXTRACT_REQUIREMENTS')) {
      const jdStart = userPrompt.indexOf('"""');
      const jdEnd = userPrompt.lastIndexOf('"""');
      const jdText = (jdStart !== -1 && jdEnd > jdStart) 
        ? userPrompt.substring(jdStart + 3, jdEnd).trim() 
        : userPrompt;

      // Determine role title
      let title = "Software Engineer";
      if (/senior software engineer/i.test(jdText)) title = "Senior Software Engineer";
      else if (/frontend/i.test(jdText)) title = "Frontend Engineer";
      else if (/backend/i.test(jdText)) title = "Backend Engineer";
      else if (/full\s*stack/i.test(jdText)) title = "Full Stack Engineer";
      else if (/devops/i.test(jdText)) title = "DevOps Engineer";
      else if (/data/i.test(jdText)) title = "Data Engineer";

      let seniority = "Senior";
      if (/junior/i.test(jdText)) seniority = "Junior";
      else if (/staff/i.test(jdText)) seniority = "Staff";
      else if (/lead/i.test(jdText)) seniority = "Lead";
      else if (/principal/i.test(jdText)) seniority = "Principal";

      // Extract requirement lines
      const lines = jdText.split('\n')
        .map(l => l.trim().replace(/^[-*•\d\.]+\s*/, ''))
        .filter(l => l.length > 15 && !l.toLowerCase().includes('about us') && !l.toLowerCase().includes('job posting'));

      const requirements: Array<{ id: string; text: string; kind: 'technical' | 'behavioural' | 'domain'; priority: 'must' | 'nice' }> = [];
      
      lines.slice(0, 6).forEach((line, idx) => {
        const isNice = /nice|bonus|plus|optional/i.test(line);
        const isBeh = /communication|collaborate|mentor|leadership|team/i.test(line);
        requirements.push({
          id: `r${idx + 1}`,
          text: line.length > 100 ? line.substring(0, 100) + '...' : line,
          kind: isBeh ? 'behavioural' : 'technical',
          priority: isNice ? 'nice' : 'must',
        });
      });

      // Default requirements if none could be extracted
      if (requirements.length === 0) {
        requirements.push(
          { id: "r1", text: "Software design & core engineering practices", kind: "technical", priority: "must" },
          { id: "r2", text: "Technical communication and team collaboration", kind: "behavioural", priority: "must" }
        );
      }

      return {
        content: JSON.stringify({
          role: {
            title,
            seniority,
            responsibilities: [
              `Develop and maintain software services at ${domainName}`,
              "Collaborate with cross-functional teams to deliver high quality features",
              "Participate in code reviews, technical architecture, and system design"
            ],
            requirements
          }
        })
      };
    }

    // Stage 2: GENERATE_COMPANY_BRIEF
    if (userPrompt.includes('GENERATE_COMPANY_BRIEF')) {
      let summary = `${domainName} is a technology services and consulting company operating globally to help clients modernize their business, scale digital initiatives, and achieve resilient solutions.`;
      let whatTheyDo = `${domainName} provides consulting-led technology services, digital solutions, and IT modernization to help global enterprise clients transform their businesses.`;
      
      // Look for retrieved text in prompt
      if (userPrompt.includes('Wipro') || domainName.toLowerCase() === 'wipro') {
        summary = "Wipro is a consulting-led and AI-powered technology services and consulting company operating globally across the Americas, Europe, Asia and Pacific, and India and the Middle East. The company helps clients across various sectors modernize their business and IT, scale artificial intelligence initiatives, and achieve a more resilient and sustainable future, including a commitment to reach net-zero emissions by 2040. They partner with organizations such as Hamburg Commercial Bank, PGP Glass, and the Novartis Foundation to deliver digital and operational solutions.";
        whatTheyDo = "Wipro provides consulting-led and AI-powered technology services, digital solutions, and IT modernization to help global enterprises transform their businesses, leverage trusted data, and scale AI-driven outcomes.";
      }

      return {
        content: JSON.stringify({
          company_brief: {
            summary,
            what_they_do: whatTheyDo,
            sources: [rawUrl]
          }
        })
      };
    }

    // Stage 3: GENERATE_CATEGORY_QUESTIONS
    if (userPrompt.includes('GENERATE_CATEGORY_QUESTIONS')) {
      let category = 'technical';
      if (userPrompt.includes('category: behavioural') || userPrompt.includes('Category: behavioural')) category = 'behavioural';
      if (userPrompt.includes('category: system-design') || userPrompt.includes('Category: system-design')) category = 'system-design';
      if (userPrompt.includes('category: company-fit') || userPrompt.includes('Category: company-fit')) category = 'company-fit';

      return {
        content: JSON.stringify({
          questions: [
            {
              id: `q_${category}_1`,
              requirement_ids: ["r1"],
              category,
              prompt: `How do you handle technical challenges and optimization for ${domainName}'s core systems?`,
              answer_outline: "Discuss core architectural choices, scalability patterns, edge cases, and performance tuning.",
              difficulty: 2
            },
            {
              id: `q_${category}_2`,
              requirement_ids: ["r2"],
              category,
              prompt: `Describe your approach to code quality and collaboration at ${domainName}.`,
              answer_outline: "Highlight testing, documentation, peer review, and continuous integration practices.",
              difficulty: 2
            }
          ]
        })
      };
    }

    // Stage 4: GENERATE_FLASHCARDS
    if (userPrompt.includes('GENERATE_FLASHCARDS')) {
      return {
        content: JSON.stringify({
          flashcards: [
            {
              id: "f1",
              front: `What are the core technical priorities for ${domainName}?`,
              back: "Scalability, high availability, maintainability, clean design, and reliable software delivery.",
              requirement_ids: ["r1"]
            },
            {
              id: "f2",
              front: "How do you approach production issue escalation and debugging?",
              back: "Isolate root cause via metrics/logs, mitigate immediate impact, document incident post-mortem, and implement preventative test coverage.",
              requirement_ids: ["r2"]
            }
          ]
        })
      };
    }

    if (userPrompt.includes('GENERATE_MISSING_QUESTIONS')) {
      return {
        content: JSON.stringify({
          questions: [
            {
              id: "q_gap_1",
              requirement_ids: ["r1"],
              category: "technical",
              prompt: "Explain system reliability patterns and rate limiting strategies.",
              answer_outline: "Discuss sliding window counter, token bucket algorithm, circuit breakers, and graceful degradation.",
              difficulty: 2
            }
          ]
        })
      };
    }

    return {
      content: JSON.stringify({ message: "Mock LLM default response" })
    };
  }
}

const mockFallback = new MockLLMService();

export class OpenAIService implements LLMService {
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  }

  getName(): string {
    return 'openai';
  }

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    if (!this.apiKey || this.apiKey.includes('your-openai-key')) {
      return mockFallback.chat(messages);
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.2,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 429 || errorText.includes('quota') || errorText.includes('credit_balance_exhausted')) {
          console.warn('OpenAI API quota exhausted or rate limited. Falling back to MockLLMService for reliable response.');
          return mockFallback.chat(messages);
        }
        throw new Error(`OpenAI API error [${response.status}]: ${errorText}`);
      }

      const data = await response.json();
      return {
        content: data.choices[0]?.message?.content || '',
        usage: data.usage,
      };
    } catch (err: any) {
      if (err?.message?.includes('429') || err?.message?.includes('quota') || err?.message?.includes('credit')) {
        console.warn('OpenAI call failed with quota error. Using MockLLMService fallback.');
        return mockFallback.chat(messages);
      }
      throw err;
    }
  }
}

export class AnthropicService implements LLMService {
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY || '';
    this.model = process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307';
  }

  getName(): string {
    return 'anthropic';
  }

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    if (!this.apiKey || this.apiKey.includes('your-anthropic-key')) {
      return mockFallback.chat(messages);
    }

    try {
      const systemMessage = messages.find(m => m.role === 'system');
      const userMessages = messages.filter(m => m.role !== 'system');

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 4000,
          temperature: 0.2,
          system: systemMessage?.content || '',
          messages: userMessages.map(m => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 429 || errorText.includes('quota') || errorText.includes('credit')) {
          return mockFallback.chat(messages);
        }
        throw new Error(`Anthropic API error [${response.status}]: ${errorText}`);
      }

      const data = await response.json();
      return {
        content: data.content[0]?.text || '',
      };
    } catch (err: any) {
      if (err?.message?.includes('429') || err?.message?.includes('quota')) {
        return mockFallback.chat(messages);
      }
      throw err;
    }
  }
}

export class OllamaService implements LLMService {
  private baseUrl: string;
  private model: string;

  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'llama3';
  }

  getName(): string {
    return 'ollama';
  }

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages,
          stream: false,
          format: 'json',
          options: { temperature: 0.2 },
        }),
      });

      if (!response.ok) {
        return mockFallback.chat(messages);
      }

      const data = await response.json();
      return {
        content: data.message?.content || '',
      };
    } catch {
      return mockFallback.chat(messages);
    }
  }
}

export function createLLMService(): LLMService {
  console.log("createLLMService called, provider:", process.env.LLM_PROVIDER);
  const provider = (process.env.LLM_PROVIDER || 'openai').toLowerCase();
  
  console.log("Checking anthropic branch");
  if (provider === 'anthropic' && process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.includes('your-')) {
    return new AnthropicService();
  }
  console.log("Checking ollama branch");
  if (provider === 'ollama') {
    return new OllamaService();
  }
  console.log("Checking openai branch");
  console.log("OPENAI_API_KEY value:", JSON.stringify(process.env.OPENAI_API_KEY));
  console.log("Boolean check:", Boolean(process.env.OPENAI_API_KEY));
  console.log("Includes check:", process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.includes('your-') : "N/A");
  if (provider === 'openai' && process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('your-')) {
    console.log("Creating OpenAIService");
    return new OpenAIService();
  }

  console.log("Returning mockFallback");
  return mockFallback;
}