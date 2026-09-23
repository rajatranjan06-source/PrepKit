'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building, BookOpen, Layers, HelpCircle, Zap, Calendar, AlertTriangle, 
  RefreshCw, Plus, Trash2, Pin, Check, Edit3, Eye, ArrowLeft, Save, ExternalLink, User
} from 'lucide-react';
import { Kit, SavedKit, Question, Flashcard } from '@/types/kit';

export default function KitDetailPage({ params }: { params: { id: string } }) {
  const [savedKit, setSavedKit] = useState<SavedKit | null>(null);
  const [kit, setKit] = useState<Kit | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'questions' | 'flashcards' | 'schedule' | 'practice' | 'weakspots'>('overview');
  
  // Question bank state
  const [selectedCategory, setSelectedCategory] = useState<'technical' | 'behavioural' | 'system-design' | 'company-fit'>('technical');
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  
  // Flashcard state
  const [, setEditingFlashcardId] = useState<string | null>(null);

  // Practice mode state
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [practiceStats, setPracticeStats] = useState<Record<string, number>>({});

  // Status indicators
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  // Load Kit Data
  useEffect(() => {
    fetch(`/api/kits/${params.id}`)
      .then(res => {
        if (res.status === 401) router.push('/login');
        return res.json();
      })
      .then(data => {
        if (data.savedKit) {
          setSavedKit(data.savedKit);
          setKit(data.savedKit.kit);
          setPracticeStats(data.savedKit.practiceStats || {});
        } else {
          setError(data.error || 'Kit not found');
        }
      })
      .catch(err => setError(err.message));
  }, [params.id, router]);

  // Sorted practice cards
  const sortedPracticeCards = (kit?.flashcards || []).slice().sort((a, b) => {
    const scoreA = practiceStats[a.id] || 0;
    const scoreB = practiceStats[b.id] || 0;
    return scoreA - scoreB;
  });

  const currentCard = sortedPracticeCards[practiceIndex] || (kit?.flashcards[0]);

  // Save changes to backend
  const saveKitChanges = async (updatedKit: Kit) => {
    setKit(updatedKit);
    setSaving(true);
    try {
      await fetch(`/api/kits/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kit: updatedKit }),
      });
    } catch (err) {
      console.error('Failed to save kit edit:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateBrief = async () => {
    if (!kit) return;
    setRegenerating(true);
    try {
      const res = await fetch(`/api/kits/${params.id}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'company_brief' }),
      });
      const data = await res.json();
      if (data.savedKit) {
        setSavedKit(data.savedKit);
        setKit(data.savedKit.kit);
      }
    } catch (err) {
      console.error('Failed to regenerate brief:', err);
    } finally {
      setRegenerating(false);
    }
  };

  // Question editing handlers
  const handleUpdateQuestion = (id: string, field: keyof Question, value: any) => {
    if (!kit) return;
    const updatedQuestions = kit.questions.map(q => {
      if (q.id === id) {
        return {
          ...q,
          [field]: value,
          origin: q.origin === 'manual' ? 'manual' : 'edited',
        } as Question;
      }
      return q;
    });
    saveKitChanges({ ...kit, questions: updatedQuestions });
  };

  const handleTogglePinQuestion = (id: string) => {
    if (!kit) return;
    const updatedQuestions = kit.questions.map(q => {
      if (q.id === id) return { ...q, pinned: !q.pinned };
      return q;
    });
    saveKitChanges({ ...kit, questions: updatedQuestions });
  };

  const handleDeleteQuestion = (id: string) => {
    if (!kit) return;
    const updatedQuestions = kit.questions.filter(q => q.id !== id);
    saveKitChanges({ ...kit, questions: updatedQuestions });
  };

  const handleAddQuestion = () => {
    if (!kit) return;
    const newId = `q_manual_${Date.now()}`;
    const newQ: Question = {
      id: newId,
      requirement_ids: [kit.role.requirements[0]?.id || 'r1'],
      category: selectedCategory,
      prompt: 'New custom interview question prompt...',
      answer_outline: 'Outline key response points here...',
      difficulty: 2,
      origin: 'manual',
      pinned: true,
    };
    saveKitChanges({ ...kit, questions: [...kit.questions, newQ] });
    setEditingQuestionId(newId);
  };

  const handleMoveQuestionCategory = (id: string, newCategory: Question['category']) => {
    if (!kit) return;
    const updatedQuestions = kit.questions.map(q => {
      if (q.id === id) return { ...q, category: newCategory, origin: 'edited' } as Question;
      return q;
    });
    saveKitChanges({ ...kit, questions: updatedQuestions });
  };

  // Flashcard handlers
  const handleAddFlashcard = () => {
    if (!kit) return;
    const newId = `f_manual_${Date.now()}`;
    const newFc: Flashcard = {
      id: newId,
      front: 'Front of card (Question)...',
      back: 'Back of card (Key Concept)...',
      requirement_ids: [kit.role.requirements[0]?.id || 'r1'],
      origin: 'manual',
      pinned: true,
    };
    saveKitChanges({ ...kit, flashcards: [...kit.flashcards, newFc] });
    setEditingFlashcardId(newId);
  };

  const handleDeleteFlashcard = (id: string) => {
    if (!kit) return;
    saveKitChanges({ ...kit, flashcards: kit.flashcards.filter(f => f.id !== id) });
  };

  // Practice mode confidence rating handler
  const handleRateFlashcard = async (flashcardId: string, confidence: number) => {
    const updatedStats = { ...practiceStats, [flashcardId]: confidence };
    setPracticeStats(updatedStats);
    setIsFlipped(false);

    try {
      await fetch(`/api/kits/${params.id}/practice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flashcardId, confidence }),
      });
    } catch (err) {
      console.error(err);
    }

    if (kit && practiceIndex < sortedPracticeCards.length - 1) {
      setPracticeIndex(practiceIndex + 1);
    } else {
      setPracticeIndex(0);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-[#F7F7EE] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-[#D6E0C5] shadow-xs text-center space-y-4 max-w-md w-full">
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold text-[#232D24]">Error Loading Kit</h2>
          <p className="text-[#556857] text-sm">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 rounded-xl bg-[#647A67] hover:bg-[#4E6151] text-white text-sm font-semibold transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!kit) {
    return (
      <div className="min-h-screen bg-[#F7F7EE] flex items-center justify-center text-[#556857] space-x-3">
        <RefreshCw className="w-6 h-6 animate-spin text-[#647A67]" />
        <span className="text-sm font-medium">Loading your prep kit...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7EE] py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Kit Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#D6E0C5] shadow-xs">
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold text-[#647A67] uppercase tracking-wider mb-1">
              <Building className="w-4 h-4 text-[#647A67]" />
              <span>{kit.source.company}</span>
              <span>•</span>
              <span>{kit.role.title}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#232D24] tracking-tight">
              {kit.role.title} <span className="text-[#556857] font-normal">({kit.role.seniority})</span>
            </h1>
          </div>

          <div className="flex items-center space-x-3">
            {saving && (
              <span className="text-xs text-[#647A67] font-bold flex items-center space-x-1 animate-pulse">
                <Save className="w-3.5 h-3.5" />
                <span>Saving...</span>
              </span>
            )}
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 rounded-xl bg-white hover:bg-[#F7F7EE] text-[#232D24] text-xs font-bold border border-[#D6E0C5] shadow-xs transition-all flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4 text-[#647A67]" />
              <span>Dashboard</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs - Sage Pill Style matching user palette */}
        <div className="flex overflow-x-auto no-scrollbar space-x-1.5 p-1.5 bg-[#EBF0DF] rounded-xl border border-[#D6E0C5]">
          {[
            { id: 'overview', label: 'Overview', icon: Building },
            { id: 'questions', label: 'Questions', icon: HelpCircle },
            { id: 'flashcards', label: 'Flashcards', icon: BookOpen },
            { id: 'schedule', label: 'Schedule', icon: Calendar },
            { id: 'practice', label: 'Practice', icon: Zap },
            { id: 'weakspots', label: 'Weak Spots', icon: AlertTriangle },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setIsFlipped(false);
                }}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#647A67] text-white shadow-xs'
                    : 'text-[#556857] hover:text-[#232D24] hover:bg-white/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#647A67]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* 1. OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Card 1: Company brief */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#D6E0C5] shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-[#232D24] flex items-center space-x-2">
                  <Building className="w-5 h-5 text-[#647A67]" />
                  <span>Company brief</span>
                </h2>
                <button
                  onClick={handleRegenerateBrief}
                  disabled={regenerating}
                  className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-[#F7F7EE] text-[#232D24] border border-[#D6E0C5] shadow-xs text-xs font-bold transition-all flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
                  <span>Regenerate</span>
                </button>
              </div>

              <div className="space-y-3 text-[#232D24] text-sm leading-relaxed font-medium">
                <p>{kit.company_brief.summary}</p>
                {kit.company_brief.what_they_do && (
                  <p>{kit.company_brief.what_they_do}</p>
                )}
              </div>

              {kit.company_brief.sources && kit.company_brief.sources.length > 0 && (
                <div className="pt-2 text-xs text-[#556857] font-mono">
                  <a
                    href={kit.company_brief.sources[0]}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline text-[#647A67] transition-colors"
                  >
                    {kit.company_brief.sources[0]}
                  </a>
                </div>
              )}
            </div>

            {/* Card 2: Role Title & Requirements */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#D6E0C5] shadow-xs space-y-4">
              <div className="flex items-center space-x-2">
                <User className="w-5 h-5 text-[#647A67]" />
                <h2 className="text-lg font-bold text-[#232D24]">
                  {kit.role.title} <span className="text-[#556857] font-normal">({kit.role.seniority})</span>
                </h2>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold text-[#556857] uppercase tracking-wider">Requirements</h3>

                {kit.role.requirements && kit.role.requirements.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {kit.role.requirements.map(req => (
                      <div key={req.id} className="p-4 rounded-xl bg-[#F7F7EE] border border-[#D6E0C5] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-[#647A67]">ID: {req.id}</span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase ${
                            req.priority === 'must' ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-[#EBF0DF] text-[#4E6151]'
                          }`}>
                            {req.priority}
                          </span>
                        </div>
                        <p className="text-xs text-[#232D24] font-semibold leading-relaxed">{req.text}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#556857] italic bg-[#F7F7EE] p-4 rounded-xl border border-[#D6E0C5]">
                    No explicit requirements were found in this job description - it may be too thin to extract from.
                  </p>
                )}
              </div>
            </div>

            {/* Card 3: Sources used */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#D6E0C5] shadow-xs space-y-3">
              <h2 className="text-lg font-bold text-[#232D24]">Sources used</h2>
              <div className="space-y-1.5">
                {(kit.company_brief.sources || [kit.source.company_url]).map((src, idx) => (
                  <div key={idx}>
                    <a
                      href={src}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-mono text-[#647A67] hover:underline transition-colors"
                    >
                      {src}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 2. QUESTIONS TAB */}
        {activeTab === 'questions' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex rounded-xl bg-[#EBF0DF] p-1.5 border border-[#D6E0C5]">
                {(['technical', 'behavioural', 'system-design', 'company-fit'] as const).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold capitalize transition-all ${
                      selectedCategory === cat ? 'bg-[#647A67] text-white shadow-xs' : 'text-[#556857] hover:text-[#232D24]'
                    }`}
                  >
                    {cat.replace('-', ' ')}
                  </button>
                ))}
              </div>

              <button
                onClick={handleAddQuestion}
                className="px-4 py-2 rounded-xl bg-[#647A67] hover:bg-[#4E6151] text-white text-xs font-bold transition-colors flex items-center space-x-2 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Add Question</span>
              </button>
            </div>

            <div className="space-y-4">
              {kit.questions
                .filter(q => q.category === selectedCategory)
                .map((q, idx) => {
                  const isEditing = editingQuestionId === q.id;

                  return (
                    <div key={q.id} className="bg-white p-6 rounded-2xl border border-[#D6E0C5] shadow-xs space-y-4 border-l-4 border-l-[#647A67]">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-[#647A67]">Q{idx + 1} ({q.id})</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-[#EBF0DF] text-[#4E6151] font-bold">
                            Difficulty: {q.difficulty}/3
                          </span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase ${
                            q.origin === 'manual' ? 'bg-amber-100 text-amber-800' : q.origin === 'edited' ? 'bg-indigo-100 text-indigo-800' : 'bg-[#EBF0DF] text-[#4E6151]'
                          }`}>
                            {q.origin}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <select
                            value={q.category}
                            onChange={e => handleMoveQuestionCategory(q.id, e.target.value as any)}
                            className="bg-[#F7F7EE] border border-[#D6E0C5] text-[#232D24] text-xs rounded-lg px-2.5 py-1 font-semibold"
                          >
                            <option value="technical">Technical</option>
                            <option value="behavioural">Behavioural</option>
                            <option value="system-design">System Design</option>
                            <option value="company-fit">Company Fit</option>
                          </select>

                          <button
                            onClick={() => handleTogglePinQuestion(q.id)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              q.pinned ? 'text-amber-700 bg-amber-50' : 'text-[#556857] hover:text-[#232D24]'
                            }`}
                            title={q.pinned ? 'Pinned' : 'Pin question'}
                          >
                            <Pin className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setEditingQuestionId(isEditing ? null : q.id)}
                            className="p-1.5 text-[#556857] hover:text-[#647A67] rounded-lg hover:bg-[#EBF0DF]"
                          >
                            {isEditing ? <Check className="w-4 h-4 text-emerald-600" /> : <Edit3 className="w-4 h-4" />}
                          </button>

                          <button
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="space-y-3 pt-2">
                          <div>
                            <label className="block text-xs font-bold text-[#556857] mb-1">Question Prompt</label>
                            <textarea
                              rows={2}
                              value={q.prompt}
                              onChange={e => handleUpdateQuestion(q.id, 'prompt', e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-[#F7F7EE] border border-[#D6E0C5] text-[#232D24] text-xs focus:ring-2 focus:ring-[#9CB495] focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-[#556857] mb-1">Answer Outline</label>
                            <textarea
                              rows={3}
                              value={q.answer_outline}
                              onChange={e => handleUpdateQuestion(q.id, 'answer_outline', e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-[#F7F7EE] border border-[#D6E0C5] text-[#232D24] text-xs focus:ring-2 focus:ring-[#9CB495] focus:outline-none"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-base font-bold text-[#232D24] leading-relaxed">{q.prompt}</p>
                          <div className="p-4 rounded-xl bg-[#F7F7EE] border border-[#D6E0C5] space-y-1">
                            <span className="text-xs font-bold text-[#556857] uppercase tracking-wider">Answer Outline</span>
                            <p className="text-xs text-[#232D24] leading-relaxed font-medium">{q.answer_outline}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center space-x-2 pt-1 text-[11px] text-[#556857]">
                        <span>Covers requirements:</span>
                        {q.requirement_ids.map(rId => (
                          <span key={rId} className="px-2 py-0.5 rounded bg-[#EBF0DF] text-[#4E6151] font-mono font-bold">
                            {rId}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* 3. FLASHCARDS TAB */}
        {activeTab === 'flashcards' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#232D24]">Flashcard Revisions</h2>
              <button
                onClick={handleAddFlashcard}
                className="px-4 py-2 rounded-xl bg-[#647A67] hover:bg-[#4E6151] text-white text-xs font-bold transition-colors flex items-center space-x-2 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Add Flashcard</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {kit.flashcards.map(fc => (
                <div key={fc.id} className="bg-white p-6 rounded-2xl border border-[#D6E0C5] shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-[#647A67]">{fc.id}</span>
                    <button
                      onClick={() => handleDeleteFlashcard(fc.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl bg-[#F7F7EE] border border-[#D6E0C5]">
                      <span className="text-[10px] font-bold text-[#556857] uppercase tracking-wider">Front (Question)</span>
                      <p className="text-xs text-[#232D24] mt-1 font-bold leading-relaxed">{fc.front}</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#F7F7EE]/80 border border-[#D6E0C5]">
                      <span className="text-[10px] font-bold text-[#647A67] uppercase tracking-wider">Back (Concept Answer)</span>
                      <p className="text-xs text-[#232D24] mt-1 leading-relaxed font-medium">{fc.back}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. SCHEDULE TAB */}
        {activeTab === 'schedule' && (
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#D6E0C5] shadow-xs space-y-6">
            <div className="border-b border-[#D6E0C5] pb-4">
              <h2 className="text-lg font-bold text-[#232D24]">Daily Preparation Schedule</h2>
              <p className="text-xs text-[#556857] mt-1 font-medium">
                Arithmetic allocation across {kit.schedule.days_available} days (Integer Minutes)
              </p>
            </div>

            <div className="space-y-4">
              {kit.schedule.days.map(day => (
                <div key={day.day} className="p-5 rounded-xl bg-[#F7F7EE] border border-[#D6E0C5] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-xs font-extrabold px-3 py-1 rounded-lg bg-[#EBF0DF] text-[#4E6151] border border-[#D6E0C5]">
                        Day {day.day}
                      </span>
                      <h4 className="text-sm font-bold text-[#232D24]">{day.focus}</h4>
                    </div>
                    <span className="text-xs font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-lg">
                      {day.minutes} Integer Minutes
                    </span>
                  </div>

                  <div className="pt-2">
                    <span className="text-[11px] font-bold text-[#556857] uppercase tracking-wider block mb-2">
                      Scheduled Question Cards:
                    </span>
                    <div className="space-y-2">
                      {day.question_ids.map(qId => {
                        const qObj = kit.questions.find(q => q.id === qId);
                        return (
                          <div key={qId} className="p-3 rounded-lg bg-white border border-[#D6E0C5] text-xs text-[#232D24] flex items-center justify-between shadow-2xs">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-[#647A67] font-bold">{qId}</span>
                              <span className="text-[#232D24] font-medium">{qObj?.prompt || 'Question prompt'}</span>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-[#EBF0DF] text-[#4E6151] font-bold capitalize">
                              {qObj?.category}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. PRACTICE MODE TAB */}
        {activeTab === 'practice' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-[#D6E0C5] shadow-xs text-center space-y-2">
              <h2 className="text-lg font-bold text-[#232D24]">Flashcard Practice Mode</h2>
              <p className="text-xs text-[#556857] font-medium">
                Prioritizes least-confident cards next based on your practice history ratings.
              </p>
              <div className="flex items-center justify-center space-x-3 text-xs font-bold text-[#647A67] pt-2">
                <span>Card {practiceIndex + 1} of {sortedPracticeCards.length}</span>
                <span>•</span>
                <span>Reviewed: {Object.keys(practiceStats).length} / {kit.flashcards.length}</span>
              </div>
            </div>

            {currentCard && (
              <div className="bg-white p-8 rounded-2xl border-2 border-[#9CB495] shadow-sm min-h-[260px] flex flex-col justify-between text-center space-y-6">
                <div className="space-y-4 my-auto">
                  <span className="text-xs font-mono font-bold text-[#556857] uppercase tracking-wider">
                    Requirement: {currentCard.requirement_ids.join(', ')}
                  </span>

                  <div className="min-h-[100px] flex items-center justify-center px-4">
                    {!isFlipped ? (
                      <h3 className="text-xl font-bold text-[#232D24] leading-relaxed">{currentCard.front}</h3>
                    ) : (
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-[#647A67] uppercase tracking-wider">Answer Concept</span>
                        <p className="text-base text-[#232D24] leading-relaxed font-medium">{currentCard.back}</p>
                      </div>
                    )}
                  </div>
                </div>

                {!isFlipped ? (
                  <button
                    onClick={() => setIsFlipped(true)}
                    className="w-full py-3.5 rounded-xl bg-[#647A67] hover:bg-[#4E6151] text-white font-bold text-sm transition-all flex items-center justify-center space-x-2 shadow-xs"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Reveal Answer</span>
                  </button>
                ) : (
                  <div className="space-y-3 pt-4 border-t border-[#D6E0C5]">
                    <span className="text-xs text-[#556857] font-bold block">Rate Your Recall Confidence:</span>
                    <div className="grid grid-cols-5 gap-2">
                      {[1, 2, 3, 4, 5].map(score => (
                        <button
                          key={score}
                          onClick={() => handleRateFlashcard(currentCard.id, score)}
                          className="py-2.5 rounded-xl bg-[#EBF0DF] hover:bg-[#647A67] hover:text-white text-[#232D24] font-bold text-sm transition-all border border-[#D6E0C5]"
                        >
                          {score}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 6. WEAK SPOTS MATRIX TAB */}
        {activeTab === 'weakspots' && (
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#D6E0C5] shadow-xs space-y-6">
            <div className="border-b border-[#D6E0C5] pb-4">
              <h2 className="text-lg font-bold text-[#232D24] flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-amber-700" />
                <span>Requirements Weak Spots Diagnostic</span>
              </h2>
              <p className="text-xs text-[#556857] mt-1 font-medium">
                Cross-references job requirements against flashcard practice ratings and question coverage.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {kit.role.requirements.map(req => {
                const coveringQs = kit.questions.filter(q => q.requirement_ids.includes(req.id));
                const coveringFcs = kit.flashcards.filter(f => f.requirement_ids.includes(req.id));
                
                const ratings = coveringFcs.map(f => practiceStats[f.id]).filter(Boolean);
                const avgRating = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : 'Not Practiced';
                const isWeak = ratings.length > 0 && Number(avgRating) <= 2.5;

                return (
                  <div
                    key={req.id}
                    className={`p-5 rounded-xl border space-y-3 ${
                      isWeak
                        ? 'bg-rose-50 border-rose-200'
                        : 'bg-[#F7F7EE] border-[#D6E0C5]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-[#647A67]">{req.id}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase ${
                        isWeak ? 'bg-rose-100 text-rose-800' : 'bg-[#EBF0DF] text-[#4E6151]'
                      }`}>
                        {isWeak ? 'Needs Revision' : 'Covered'}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-[#232D24]">{req.text}</p>

                    <div className="flex items-center justify-between text-xs text-[#556857] border-t border-[#D6E0C5] pt-2">
                      <div>Questions: {coveringQs.length}</div>
                      <div>Avg Confidence: <span className="text-amber-800 font-bold">{avgRating}</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
