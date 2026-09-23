# PrepKit - Autonomous AI Interview Preparation Kit Generator

PrepKit is a full-stack web application and CLI suite that transforms a job description and company website URL into a personalized, structured interview-preparation kit. 

Every generated kit includes an evidence-backed **Company Brief**, **Role Requirement Breakdown**, **Categorized Question Bank**, **Revision Flashcards**, a **Deterministic Study Schedule**, an **Interactive Flashcard Practice Mode**, and a **Weak Spots Diagnostic Matrix**.

---

## 🚀 Tech Stack & Justification

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
  - *Justification*: Next.js App Router provides seamless server/client component boundaries, streaming UI states, and responsive styling with Tailwind.
- **Backend / API**: Node.js + TypeScript (Next.js API Route Handlers & Service Layer)
  - *Justification*: Modular service abstractions cleanly separate crawling, LLM generation, coverage gap checking, schedule allocation, and database persistence.
- **Database**: MongoDB (via official driver) with transparent In-Memory Fallback
  - *Justification*: Flexible JSON document structure perfectly fits the Appendix A kit specification. The in-memory fallback enables running unit tests and batch evaluations without requiring a running MongoDB server instance.
- **Validation**: Zod (v3)
  - *Justification*: Guarantees strict runtime type-safety for request payloads, LLM output structures (Appendix A), and batch CLI inputs/outputs (Appendix B).
- **Web Crawling**: Cheerio + Axios + Robots-Parser
  - *Justification*: Lightweight, fast HTML parsing with `robots.txt` compliance, link relevance ranking, and SSRF security validation.
- **LLM Provider**: Configurable Multi-Provider Service (OpenAI `gpt-4o-mini`, Anthropic `claude-3-haiku`, Ollama `llama3`, and automatic `MockLLMService` Fallback).

---

## 📦 Installation & Local Setup

### 1. Prerequisites
- Node.js >= v18.x
- npm >= v9.x
- MongoDB (optional, in-memory store is automatically used if mongod is offline)

### 2. Installation
```bash
# Clone repository and install dependencies
git clone https://github.com/your-username/PrepKit.git
cd PrepKit
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Configurable `.env` keys:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/prepkit

# Auth
JWT_SECRET=super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# LLM Provider Configuration ('openai' | 'anthropic' | 'ollama' | 'mock')
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-your-openai-key
OPENAI_MODEL=gpt-4o-mini

# Allow local IP/localhost crawling for dev evaluation
ALLOW_LOCAL_CRAWL=true
```
*Note*: If `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` is not provided, PrepKit automatically uses its built-in `MockLLMService`, ensuring full functionality for offline execution and testing.

---

## ⚡ Batch Evaluation Command (Mandatory Entry Point)

To run the batch pipeline across test cases without launching the web UI:

```bash
npm run evaluate -- --input <cases.json> --output <kits.json>
```

### Example Input (`cases.json`):
```json
[
  {
    "id": "case-01",
    "jd": "Senior Backend Engineer with Node.js and MongoDB experience.",
    "company_url": "https://example.com/acme",
    "days": 5
  }
]
```

### Output (`kits.json` - Appendix B Compliant):
```json
{
  "version": "1.0",
  "generated_at": "2026-09-23T03:20:00.000Z",
  "kits": [
    {
      "id": "case-01",
      "status": "ok",
      "kit": { /* Appendix A JSON Structure */ },
      "error": null
    }
  ]
}
```

---

## 🏛️ High-Level Architecture & Service Boundaries

```
src/
├── types/              # Zod schemas (Kit, Appendix A & B, Auth)
├── lib/
│   ├── db.ts           # MongoDB persistence with auto in-memory fallback
│   ├── auth.ts         # JWT & bcrypt authentication helpers
│   └── ssrf.ts         # SSRF IP address validation & security
├── services/
│   ├── crawler.ts      # Link-ranking web crawler & HTML cleaner
│   ├── llm.ts          # Multi-provider LLM service with backoff retries
│   ├── coverage.ts     # Deterministic coverage checker & gap-fill loop
│   ├── schedule.ts     # Pure arithmetic day schedule allocator
│   ├── builder.ts      # Edit-preserving section regenerator
│   └── pipeline.ts     # Main multi-step generation coordinator
├── cli/
│   ├── evaluate.ts     # Batch CLI evaluation runner
│   └── seed.ts         # Demo dataset seeder
├── app/                # Next.js App Router (UI & API endpoints)
└── components/         # Reusable UI components (Navbar, Cards, Tabs)
```

---

## 🔍 Retrieval & Generation Pipeline Sequencing

PrepKit executes a multi-step pipeline rather than relying on a single prompt:

1. **Extract Requirements**: Parses job title, seniority, responsibilities, and assigns stable requirement IDs (`r1`, `r2`, ...). Classifies priority (`must` vs `nice`) based strictly on posting text without inventing requirements.
2. **Crawl Company Site**: Validates target URL against SSRF checks. Crawls site, respecting `robots.txt`, and ranks links by relevance (`careers`, `jobs`, `hiring`, `handbook`, `engineering`, `culture`, `about`). Skips inaccessible pages gracefully (`failedUrls`).
3. **Public Discussion Search**: Searches and records public interview discussions and reviews.
4. **Generate Company Brief**: Builds evidence-backed summary and product overview using only retrieved content.
5. **Generate Categorized Questions**: Calls LLM separately for `technical`, `behavioural`, `system-design`, and `company-fit` categories, mapping every question to requirement IDs.
6. **Deterministic Coverage Check & Second Pass**: Application code identifies any `must`-have requirements missing question coverage. Triggers targeted second-pass generation to guarantee 100% must-have coverage. Capped at max 3 passes.
7. **Deterministic Schedule Building**: Pure application arithmetic distributes questions across requested `days_available` (1 to 90), placing higher difficulty (3 & 2) and `must` items on earlier days with integer minutes.

---

## ✏️ State Preservation & Kit Builder Behavior

To ensure user edits are never overwritten when regenerating sections:

- **State Model**: Each question and flashcard maintains metadata:
  - `origin`: `'generated' | 'edited' | 'manual'`
  - `pinned`: `boolean`
- **Category Regeneration Rule**: When regenerating a question category (e.g., `technical`), PrepKit replaces unpinned `generated` questions in that category while **strictly preserving all user-edited, manually added, and pinned items**.
- **Cross-Section Isolation**: Regenerating the company brief, schedule, or flashcards does not modify or clobber questions in other sections.

---

## 🗓️ Schedule Allocation Logic

Executed strictly in pure TypeScript (`src/services/schedule.ts`):
- **Exact Days Match**: Spans exactly `days_available` days (handles 1-day to 60-day schedules).
- **Must-Have Guarantee**: Every must-have requirement appears in at least one scheduled day.
- **Priority & Difficulty Ordering**: Sorts questions by priority (`must` > `nice`) and difficulty (3 > 2 > 1) to place harder material earlier in the schedule.
- **Integer Minutes**: Calculates duration in integer minutes only (e.g., 45, 60, 90 mins).
- **ID Integrity**: Every scheduled `question_ids` entry references a valid existing question.

---

## 💡 Creative Feature: Weak Spots Diagnostic Matrix

PrepKit includes an integrated **Weak Spots Diagnostic Matrix** (Tab 7):
- Links user practice performance (flashcard confidence ratings 1..5) with requirement coverage.
- Identifies requirements with low average confidence (<= 2.5) or zero question coverage.
- Provides direct single-click action buttons to drill down into low-confidence cards during revision.

---

## 🛡️ Reliability, Security & Failure Handling

- **SSRF Prevention**: Production environment rejects loopback (`127.0.0.1`, `::1`) and private IPv4 ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`). Local crawling enabled via `ALLOW_LOCAL_CRAWL=true`.
- **Untrusted Content Handling**: Crawled pages and pasted JDs are treated strictly as unverified text data within isolated prompt delimiters, preventing prompt injection attacks.
- **Rate Limiting & Retries**: Multi-tier LLM calls use exponential backoff retries (1s, 2s, 4s) when encountering HTTP 429 or rate limits.
- **Duplicate Prevention**: In-memory job lock (`userId:companyUrl:jd`) prevents concurrent duplicate generation jobs.
- **Soft Crawl Failures**: Unreachable company sites or missing hiring pages are logged in `failedUrls` without crashing the kit generation.

---

## 🧪 Automated Testing

Execute the automated test suite:

```bash
npm test
```

Test coverage includes:
- `tests/schedule.test.ts`: Schedule arithmetic, day counts, must-have inclusion, integer minutes.
- `tests/coverage.test.ts`: Deterministic coverage gap detection & second-pass generation.
- `tests/schema.test.ts`: Strict Appendix A JSON schema validation.
- `tests/regeneration.test.ts`: Preservation of edited/manual/pinned questions during regeneration.
- `tests/evaluator.test.ts`: Batch evaluation CLI command & Appendix B output validation.
