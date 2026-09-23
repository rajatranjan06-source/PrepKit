import Link from 'next/link';
import { Sparkles, ArrowRight, ShieldCheck, Cpu, Calendar, CheckCircle2, Zap, Layers, FileText } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="space-y-20 py-8 font-sans">
      {/* Hero Section */}
      <div className="text-center space-y-6 max-w-4xl mx-auto pt-6">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#EBF0DF] border border-[#D6E0C5] text-[#4E6151] text-xs font-bold tracking-wide uppercase">
          <Sparkles className="w-3.5 h-3.5 text-[#647A67]" />
          <span>Personalized AI Interview Intelligence</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-[#232D24] leading-tight">
          Turn any Job Posting into a <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-[#647A67] to-[#4E6151] bg-clip-text text-transparent">
            Custom Interview Kit
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-[#556857] max-w-2xl mx-auto leading-relaxed font-medium">
          Paste a job description and company URL. PrepKit automatically crawls internal engineering pages, extracts requirement must-haves, generates categorized questions, and builds a day-by-day study schedule.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/kits/new"
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#647A67] hover:bg-[#4E6151] text-white font-bold text-base shadow-xs transition-all flex items-center justify-center space-x-2"
          >
            <span>Create Your Kit Now</span>
            <ArrowRight className="w-5 h-5" />
          </Link>

          <Link
            href="/register"
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white hover:bg-[#F7F7EE] text-[#232D24] font-bold text-base border border-[#D6E0C5] transition-all text-center shadow-2xs"
          >
            Sign Up Free
          </Link>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8">
        <div className="bg-white p-6 rounded-2xl border border-[#D6E0C5] shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#EBF0DF] border border-[#D6E0C5] flex items-center justify-center text-[#647A67]">
            <Cpu className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-[#232D24]">Multi-Step Research</h3>
          <p className="text-[#556857] text-sm leading-relaxed font-medium">
            Crawls company sites for hiring process pages, engineering blogs, and public interview discussions. Never relies on single-shot LLM prompts.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#D6E0C5] shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#EBF0DF] border border-[#D6E0C5] flex items-center justify-center text-[#647A67]">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-[#232D24]">Deterministic Gap Check</h3>
          <p className="text-[#556857] text-sm leading-relaxed font-medium">
            Runs application-level coverage analysis. Any must-have requirement missing a question triggers targeted second-pass question generation.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#D6E0C5] shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#EBF0DF] border border-[#D6E0C5] flex items-center justify-center text-[#647A67]">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-[#232D24]">Arithmetic Schedule</h3>
          <p className="text-[#556857] text-sm leading-relaxed font-medium">
            Calculates exact integer-minute daily study schedules matched to your interview deadline, prioritizing high-difficulty topics early.
          </p>
        </div>
      </div>

      {/* Deep Dive Section */}
      <div className="bg-white p-8 sm:p-12 rounded-2xl border border-[#D6E0C5] shadow-xs space-y-8">
        <div className="max-w-2xl">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#232D24]">Interactive Kit Builder & Practice Mode</h2>
          <p className="text-[#556857] mt-2 font-medium">
            Every kit comes complete with interactive sections designed for active revision.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-4 rounded-xl bg-[#F7F7EE] border border-[#D6E0C5] space-y-2">
            <FileText className="w-5 h-5 text-[#647A67]" />
            <h4 className="font-bold text-[#232D24]">Company Brief</h4>
            <p className="text-xs text-[#556857] font-medium">Verified evidence-based summary of company culture and tech stack.</p>
          </div>

          <div className="p-4 rounded-xl bg-[#F7F7EE] border border-[#D6E0C5] space-y-2">
            <Layers className="w-5 h-5 text-[#647A67]" />
            <h4 className="font-bold text-[#232D24]">State-Preserved Builder</h4>
            <p className="text-xs text-[#556857] font-medium">Inline edit, reorder & add items. Custom questions preserved.</p>
          </div>

          <div className="p-4 rounded-xl bg-[#F7F7EE] border border-[#D6E0C5] space-y-2">
            <Zap className="w-5 h-5 text-[#647A67]" />
            <h4 className="font-bold text-[#232D24]">Flashcard Practice</h4>
            <p className="text-xs text-[#556857] font-medium">Flip card revision with confidence ratings and priority recommendations.</p>
          </div>

          <div className="p-4 rounded-xl bg-[#F7F7EE] border border-[#D6E0C5] space-y-2">
            <CheckCircle2 className="w-5 h-5 text-[#647A67]" />
            <h4 className="font-bold text-[#232D24]">Weak Spots Report</h4>
            <p className="text-xs text-[#556857] font-medium">Diagnostic matrix pinpointing under-prepared job requirements.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
