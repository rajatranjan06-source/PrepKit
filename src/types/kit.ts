import { z } from 'zod';

// Appendix A Requirement Schema
export const RequirementSchema = z.object({
  id: z.string().regex(/^r\d+$/),
  text: z.string(),
  kind: z.enum(['technical', 'behavioural', 'domain']),
  priority: z.enum(['must', 'nice']),
});

// Question Schema with edit origin tracking metadata
export const QuestionSchema = z.object({
  id: z.string().regex(/^q\d+$/),
  requirement_ids: z.array(z.string().regex(/^r\d+$/)),
  category: z.enum(['technical', 'behavioural', 'system-design', 'company-fit']),
  prompt: z.string(),
  answer_outline: z.string(),
  difficulty: z.number().int().min(1).max(3),
  origin: z.enum(['generated', 'edited', 'manual']).optional().default('generated'),
  pinned: z.boolean().optional().default(false),
});

// Flashcard Schema
export const FlashcardSchema = z.object({
  id: z.string().regex(/^f\d+$/),
  front: z.string(),
  back: z.string(),
  requirement_ids: z.array(z.string().regex(/^r\d+$/)),
  origin: z.enum(['generated', 'edited', 'manual']).optional().default('generated'),
  pinned: z.boolean().optional().default(false),
});

// Schedule Day Schema
export const ScheduleDaySchema = z.object({
  day: z.number().int().positive(),
  focus: z.string(),
  question_ids: z.array(z.string().regex(/^q\d+$/)),
  minutes: z.number().int().positive(),
});

// Schedule Schema
export const ScheduleSchema = z.object({
  days_available: z.number().int().positive(),
  days: z.array(ScheduleDaySchema),
});

// Coverage Schema
export const CoverageSchema = z.object({
  uncovered_requirement_ids: z.array(z.string().regex(/^r\d+$/)),
  passes: z.number().int().nonnegative(),
});

// Source Metadata Schema
export const SourceSchema = z.object({
  company: z.string(),
  company_url: z.string(),
  role: z.string(),
  location: z.string(),
  jd_chars: z.number().int().nonnegative(),
  researched_at: z.string(),
  pages_used: z.array(z.string()),
});

// Company Brief Schema
export const CompanyBriefSchema = z.object({
  summary: z.string(),
  what_they_do: z.string(),
  sources: z.array(z.string()),
});

// Role Breakdown Schema
export const RoleSchema = z.object({
  title: z.string(),
  seniority: z.string(),
  responsibilities: z.array(z.string()),
  requirements: z.array(RequirementSchema),
});

// Full Kit Schema (Strict Appendix A match)
export const KitSchema = z.object({
  source: SourceSchema,
  company_brief: CompanyBriefSchema,
  role: RoleSchema,
  questions: z.array(QuestionSchema),
  flashcards: z.array(FlashcardSchema),
  schedule: ScheduleSchema,
  coverage: CoverageSchema,
});

// TypeScript Types derived from Zod
export type Requirement = z.infer<typeof RequirementSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type Flashcard = z.infer<typeof FlashcardSchema>;
export type ScheduleDay = z.infer<typeof ScheduleDaySchema>;
export type Schedule = z.infer<typeof ScheduleSchema>;
export type Coverage = z.infer<typeof CoverageSchema>;
export type Source = z.infer<typeof SourceSchema>;
export type CompanyBrief = z.infer<typeof CompanyBriefSchema>;
export type Role = z.infer<typeof RoleSchema>;
export type Kit = z.infer<typeof KitSchema>;

// Document wrapper stored in MongoDB
export interface SavedKit {
  _id?: string;
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  kit: Kit;
  practiceStats?: Record<string, number>; // flashcardId -> confidence (1..5)
}

// Request validation schemas
export const CreateKitRequestSchema = z.object({
  jobDescription: z.string().min(20, 'Job description too short (at least 20 characters)'),
  companyUrl: z.string().url('Invalid company URL'),
  daysBeforeInterview: z.number().int().min(1).max(90),
});

export const RegisterRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

export const LoginRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password required'),
});

// Appendix B Batch evaluation schemas
export const BatchCaseSchema = z.object({
  id: z.string(),
  jd: z.string(),
  company_url: z.string(),
  days: z.number().int().positive(),
});

export const BatchOutputCaseSchema = z.object({
  id: z.string(),
  status: z.enum(['ok', 'failed']),
  kit: KitSchema.nullable(),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }).nullable(),
});

export const BatchOutputSchema = z.object({
  version: z.literal('1.0'),
  generated_at: z.string(),
  kits: z.array(BatchOutputCaseSchema),
});

export type BatchCase = z.infer<typeof BatchCaseSchema>;
export type BatchOutputCase = z.infer<typeof BatchOutputCaseSchema>;
export type BatchOutput = z.infer<typeof BatchOutputSchema>;