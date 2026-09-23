import { saveKitToDb, saveUserToDb } from '../lib/db';
import { hashPassword } from '../lib/auth';
import { Kit } from '../types/kit';

async function seed() {
  console.log('Seeding demo user and sample interview kit...');

  const userId = 'user_demo_123';
  const hashedPassword = await hashPassword('password123');

  await saveUserToDb({
    id: userId,
    email: 'demo@prepkit.dev',
    name: 'Demo Candidate',
    password: hashedPassword,
    createdAt: new Date().toISOString(),
  });

  const demoKit: Kit = {
    source: {
      company: 'Acme Cloud Services',
      company_url: 'https://example.com/acme',
      role: 'Senior Backend Engineer',
      location: 'Remote',
      jd_chars: 1450,
      researched_at: new Date().toISOString(),
      pages_used: ['https://example.com/acme/careers', 'https://example.com/acme/engineering'],
    },
    company_brief: {
      summary: 'Acme Cloud Services designs high-concurrency cloud infrastructure and AI automation engines for Fortune 500 tech companies.',
      what_they_do: 'Develops enterprise distributed microservices, message queues, and developer tooling.',
      sources: ['https://example.com/acme/about'],
    },
    role: {
      title: 'Senior Backend Engineer',
      seniority: 'Senior',
      responsibilities: [
        'Architect and implement scalable Node.js microservices.',
        'Optimize MongoDB database queries, indexes, and aggregation pipelines.',
        'Ensure robust API security, SSRF prevention, and rate-limiting.',
      ],
      requirements: [
        { id: 'r1', text: '5+ years experience with Node.js & TypeScript', kind: 'technical', priority: 'must' },
        { id: 'r2', text: 'Strong MongoDB database modeling & index optimization', kind: 'technical', priority: 'must' },
        { id: 'r3', text: 'Web scraping, crawling architecture & SSRF security', kind: 'technical', priority: 'must' },
        { id: 'r4', text: 'Cross-functional engineering leadership & mentoring', kind: 'behavioural', priority: 'must' },
        { id: 'r5', text: 'React and Next.js frontend experience', kind: 'technical', priority: 'nice' },
      ],
    },
    questions: [
      {
        id: 'q1',
        requirement_ids: ['r1', 'r2'],
        category: 'technical',
        prompt: 'How do you design high-concurrency write pipelines in Node.js with MongoDB without overwhelming the DB pool?',
        answer_outline: 'Use connection pooling, batch insert operations, Redis token bucket rate limiting, and write concerns.',
        difficulty: 3,
        origin: 'generated',
        pinned: true,
      },
      {
        id: 'q2',
        requirement_ids: ['r3'],
        category: 'technical',
        prompt: 'What security validation logic must be enforced when crawling external URLs to prevent SSRF vulnerabilities?',
        answer_outline: 'Enforce allowed schemes (HTTP/HTTPS), block loopback (127.0.0.1, ::1) and private CIDR ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16), and set strict timeouts.',
        difficulty: 2,
        origin: 'generated',
        pinned: false,
      },
      {
        id: 'q3',
        requirement_ids: ['r4'],
        category: 'behavioural',
        prompt: 'Describe a time when you mentored a junior engineer who was struggling with complex architectural choices.',
        answer_outline: 'Explain context, 1-on-1 pairing sessions, breaking down concepts into RFCs, encouraging code reviews, and measured performance outcome.',
        difficulty: 2,
        origin: 'generated',
        pinned: false,
      },
      {
        id: 'q4',
        requirement_ids: ['r1', 'r2'],
        category: 'system-design',
        prompt: 'Design an end-to-end distributed job processing engine for multi-step AI interview kit generation.',
        answer_outline: 'Cover request ingestion, persistent job state in MongoDB, BullMQ/Redis task queue, worker retry backoff, and progress polling.',
        difficulty: 3,
        origin: 'generated',
        pinned: false,
      },
      {
        id: 'q5',
        requirement_ids: ['r4'],
        category: 'company-fit',
        prompt: 'Why are you passionate about building developer tools and cloud infrastructure at Acme Cloud Services?',
        answer_outline: 'Highlight technical alignment, developer velocity, and enthusiasm for scalable cloud architecture.',
        difficulty: 1,
        origin: 'generated',
        pinned: false,
      },
    ],
    flashcards: [
      {
        id: 'f1',
        front: 'What is SSRF and how is it prevented in web crawlers?',
        back: 'Server-Side Request Forgery allows attackers to force a server to send requests to internal resources. Prevent by parsing URLs, validating destination IPs against private CIDR blocks, and blocking local addresses.',
        requirement_ids: ['r3'],
        origin: 'generated',
        pinned: false,
      },
      {
        id: 'f2',
        front: 'What is the ESR rule in MongoDB index optimization?',
        back: 'Equality first, Sort second, Range third. Organizes index keys to maximize selectivity and minimize in-memory sorting.',
        requirement_ids: ['r2'],
        origin: 'generated',
        pinned: false,
      },
    ],
    schedule: {
      days_available: 5,
      days: [
        { day: 1, focus: 'Day 1: Technical Depth & System Design', question_ids: ['q1', 'q4'], minutes: 90 },
        { day: 2, focus: 'Day 2: Web Security & Crawling', question_ids: ['q2'], minutes: 60 },
        { day: 3, focus: 'Day 3: Behavioural & Leadership', question_ids: ['q3'], minutes: 45 },
        { day: 4, focus: 'Day 4: Company Fit & Review', question_ids: ['q5'], minutes: 30 },
        { day: 5, focus: 'Day 5: Mock Practice & Final Review', question_ids: ['q1', 'q2', 'q3'], minutes: 60 },
      ],
    },
    coverage: {
      uncovered_requirement_ids: [],
      passes: 1,
    },
  };

  await saveKitToDb({
    id: 'demo_kit_001',
    userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    kit: demoKit,
    practiceStats: { f1: 4, f2: 2 },
  });

  console.log('Seeding complete! Log in with demo@prepkit.dev / password123');
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
