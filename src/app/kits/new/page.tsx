'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Globe, Calendar, AlertCircle, CheckCircle2, Loader2, FileText, Upload } from 'lucide-react';

const STAGES = [
  'Extracting job requirements',
  'Crawling company website',
  'Finding hiring-process information',
  'Looking for public interview discussion',
  'Generating categorized questions',
  'Checking requirement coverage',
  'Building schedule',
  'Saving kit'
];

export default function CreateKitPage() {
  const [activeTab, setActiveTab] = useState<'single' | 'batch'>('single');

  // Single kit form state
  const [jobDescription, setJobDescription] = useState('');
  const [companyUrl, setCompanyUrl] = useState('');
  const [daysBeforeInterview, setDaysBeforeInterview] = useState(5);

  // Batch upload state
  const [, setBatchFile] = useState<File | null>(null);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);

  const [loading, setLoading] = useState(false);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleSubmitSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (jobDescription.length < 20) {
      setError('Job description must be at least 20 characters.');
      return;
    }
    setError('');
    setLoading(true);
    setCurrentStageIndex(0);

    const stageInterval = setInterval(() => {
      setCurrentStageIndex(prev => {
        if (prev < STAGES.length - 1) return prev + 1;
        return prev;
      });
    }, 1800);

    try {
      const res = await fetch('/api/kits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobDescription,
          companyUrl,
          daysBeforeInterview,
        }),
      });

      clearInterval(stageInterval);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate kit');
      }

      setCurrentStageIndex(STAGES.length - 1);
      setTimeout(() => {
        router.push(`/kits/${data.kitId}`);
      }, 500);
    } catch (err: any) {
      clearInterval(stageInterval);
      setError(err.message);
      setLoading(false);
    }
  };

  const handleJsonFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setBatchFile(file);

    try {
      const text = await file.text();
      const items = JSON.parse(text);

      if (!Array.isArray(items) || items.length === 0) {
        throw new Error('JSON file must contain an array of items.');
      }

      setLoading(true);
      setBatchProgress({ current: 0, total: items.length });

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const jd = item.jd || item.jobDescription || item.job_description || '';
        const url = item.company_url || item.companyUrl || item.url || 'https://example.com';
        const days = item.days || item.daysBeforeInterview || 5;

        if (!jd || jd.length < 10) {
          console.warn(`Skipping batch item ${i + 1}: invalid job description`);
          continue;
        }

        setBatchProgress({ current: i + 1, total: items.length });

        await fetch('/api/kits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobDescription: jd,
            companyUrl: url,
            daysBeforeInterview: Number(days) || 5,
          }),
        });
      }

      setTimeout(() => {
        router.push('/dashboard');
      }, 500);
    } catch (err: any) {
      setError(`Failed to process batch JSON: ${err.message}`);
      setLoading(false);
      setBatchProgress(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7EE] py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-[#232D24] tracking-tight">
            Paste a job description, get a prep plan
          </h1>
          <p className="text-[#556857] text-sm leading-relaxed font-medium">
            We'll research the company, extract the real requirements, and build questions, flashcards, and a schedule around them.
          </p>
        </div>

        {/* Tab Switcher (Single role | Batch upload) */}
        <div className="inline-flex p-1.5 rounded-xl bg-[#EBF0DF] border border-[#D6E0C5]">
          <button
            type="button"
            onClick={() => { setActiveTab('single'); setError(''); }}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'single'
                ? 'bg-white text-[#232D24] shadow-xs border border-[#D6E0C5]'
                : 'text-[#556857] hover:text-[#232D24]'
            }`}
          >
            Single role
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('batch'); setError(''); }}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'batch'
                ? 'bg-white text-[#232D24] shadow-xs border border-[#D6E0C5]'
                : 'text-[#556857] hover:text-[#232D24]'
            }`}
          >
            Batch upload
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading Progress */}
        {loading ? (
          <div className="bg-white p-8 rounded-2xl border border-[#D6E0C5] shadow-xs space-y-6 text-center">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-[#EBF0DF] text-[#4E6151] text-xs font-bold animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Pipeline Active</span>
            </div>
            <h3 className="text-xl font-bold text-[#232D24]">
              {batchProgress 
                ? `Processing Batch Kit ${batchProgress.current} of ${batchProgress.total}...` 
                : 'Generating Your Personalized Kit'}
            </h3>

            {!batchProgress && (
              <div className="space-y-3 pt-4 text-left">
                {STAGES.map((stageName, idx) => {
                  const isDone = idx < currentStageIndex;
                  const isCurrent = idx === currentStageIndex;

                  return (
                    <div
                      key={stageName}
                      className={`flex items-center space-x-3 p-3.5 rounded-xl border text-sm transition-all ${
                        isDone
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-medium'
                          : isCurrent
                          ? 'bg-[#EBF0DF] border-[#9CB495] text-[#232D24] font-bold shadow-xs'
                          : 'bg-[#F7F7EE] border-[#D6E0C5] text-[#556857]'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : isCurrent ? (
                        <Loader2 className="w-4 h-4 text-[#647A67] animate-spin shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-[#D6E0C5] shrink-0" />
                      )}
                      <span>{stageName}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : activeTab === 'single' ? (
          /* Single role form */
          <form onSubmit={handleSubmitSingle} className="bg-white p-6 sm:p-8 rounded-2xl border border-[#D6E0C5] shadow-xs space-y-6">
            <div className="border-b border-[#D6E0C5] pb-4">
              <h2 className="text-lg font-bold text-[#232D24]">Job Posting & Company Setup</h2>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#556857] uppercase tracking-wider mb-2">
                Company Website URL
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 absolute left-3.5 top-3.5 text-[#647A67]" />
                <input
                  type="url"
                  required
                  value={companyUrl}
                  onChange={e => setCompanyUrl(e.target.value)}
                  placeholder="https://company.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F7F7EE] border border-[#D6E0C5] text-[#232D24] placeholder-[#556857] text-sm focus:outline-none focus:ring-2 focus:ring-[#9CB495]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#556857] uppercase tracking-wider mb-2">
                Days Before Interview
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min={1}
                  max={30}
                  value={daysBeforeInterview}
                  onChange={e => setDaysBeforeInterview(Number(e.target.value))}
                  className="flex-1 accent-[#647A67]"
                />
                <div className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-[#EBF0DF] border border-[#D6E0C5] text-sm text-[#232D24] font-bold min-w-[75px] justify-center">
                  <Calendar className="w-4 h-4 mr-1 text-[#647A67]" />
                  <span>{daysBeforeInterview} Days</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#556857] uppercase tracking-wider mb-2">
                Job Description Text
              </label>
              <textarea
                required
                rows={8}
                value={jobDescription}
                onChange={e => setJobDescription(e.target.value)}
                placeholder="Paste full job description text here..."
                className="w-full px-4 py-3 rounded-xl bg-[#F7F7EE] border border-[#D6E0C5] text-[#232D24] placeholder-[#556857] text-sm focus:outline-none focus:ring-2 focus:ring-[#9CB495] leading-relaxed font-mono text-xs"
              />
            </div>

            <button
              type="submit"
              className="w-full py-4 rounded-xl bg-[#647A67] hover:bg-[#4E6151] text-white font-bold text-base shadow-xs transition-all flex items-center justify-center space-x-2"
            >
              <Sparkles className="w-5 h-5 text-[#EBF0DF]" />
              <span>Generate Interview Kit</span>
            </button>
          </form>
        ) : (
          /* Batch upload panel */
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#D6E0C5] shadow-xs space-y-6">
            <p className="text-sm text-[#232D24] leading-relaxed font-medium">
              Upload a JSON file containing an array of{' '}
              <code className="bg-[#EBF0DF] px-2 py-0.5 rounded text-[#232D24] font-mono text-xs border border-[#D6E0C5]">
                &#123; jd, company_url, days &#125;
              </code>{' '}
              objects to create several kits at once.
            </p>

            <input
              type="file"
              ref={fileInputRef}
              accept=".json,application/json"
              onChange={handleJsonFileUpload}
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#D6E0C5] hover:border-[#9CB495] rounded-2xl p-12 text-center cursor-pointer transition-all bg-[#F7F7EE]/60 hover:bg-[#F7F7EE] space-y-3"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#EBF0DF] text-[#647A67] flex items-center justify-center mx-auto border border-[#D6E0C5]">
                <FileText className="w-6 h-6" />
              </div>
              <div className="text-sm font-bold text-[#232D24]">
                Click to choose a JSON file
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
