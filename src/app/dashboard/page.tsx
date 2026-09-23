'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, PlusCircle, Calendar, Trash2, ArrowRight, Building, Search, AlertCircle } from 'lucide-react';
import { SavedKit } from '@/types/kit';

export default function DashboardPage() {
  const [kits, setKits] = useState<SavedKit[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  const fetchKits = async () => {
    try {
      const res = await fetch('/api/kits');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch kits');
      setKits(data.kits || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKits();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this interview kit?')) return;

    try {
      const res = await fetch(`/api/kits/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setKits(kits.filter(k => k.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredKits = kits.filter(k => {
    const q = search.toLowerCase();
    return (
      k.kit.source.company.toLowerCase().includes(q) ||
      k.kit.source.role.toLowerCase().includes(q) ||
      k.kit.role.title.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8 py-4 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#232D24] tracking-tight">Your Saved Interview Kits</h1>
          <p className="text-[#556857] text-sm mt-1">
            Access, edit, and practice against your personalized preparation kits
          </p>
        </div>

        <Link
          href="/kits/new"
          className="inline-flex items-center space-x-2 px-5 py-3 rounded-xl bg-[#647A67] hover:bg-[#4E6151] text-white font-bold text-sm transition-all shadow-xs"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create New Kit</span>
        </Link>
      </div>

      {/* Search Bar */}
      {kits.length > 0 && (
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-[#647A67]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by company or role title..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#D6E0C5] text-[#232D24] placeholder-[#556857] text-sm focus:outline-none focus:ring-2 focus:ring-[#9CB495]"
          />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white p-6 h-48 animate-pulse border border-[#D6E0C5] rounded-2xl" />
          ))}
        </div>
      ) : filteredKits.length === 0 ? (
        /* Empty state */
        <div className="bg-white p-12 text-center space-y-4 max-w-lg mx-auto rounded-2xl border border-[#D6E0C5] shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-[#EBF0DF] border border-[#D6E0C5] flex items-center justify-center text-[#647A67] mx-auto">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-[#232D24]">No Interview Kits Found</h3>
          <p className="text-[#556857] text-sm leading-relaxed">
            {search ? 'No saved kits match your search criteria.' : 'Create your first personalized prep kit from a job posting and company URL.'}
          </p>
          {!search && (
            <Link
              href="/kits/new"
              className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-[#647A67] hover:bg-[#4E6151] text-white font-bold text-sm transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Your First Kit</span>
            </Link>
          )}
        </div>
      ) : (
        /* Grid of Kits */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredKits.map(item => (
            <Link
              key={item.id}
              href={`/kits/${item.id}`}
              className="bg-white p-6 space-y-4 rounded-2xl border border-[#D6E0C5] hover:border-[#9CB495] hover:shadow-md transition-all group block relative"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 text-xs font-bold text-[#647A67] uppercase tracking-wider">
                    <Building className="w-3.5 h-3.5" />
                    <span>{item.kit.source.company}</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#232D24] group-hover:text-[#647A67] transition-colors line-clamp-1">
                    {item.kit.role.title}
                  </h3>
                </div>

                <button
                  onClick={e => handleDelete(item.id, e)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete Kit"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center space-x-3 text-xs text-[#556857] border-t border-b border-[#EBF0DF] py-3">
                <div className="flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-[#647A67]" />
                  <span>{item.kit.schedule.days_available} Days Prep</span>
                </div>
                <span>•</span>
                <div>{item.kit.questions.length} Questions</div>
                <span>•</span>
                <div>{item.kit.flashcards.length} Flashcards</div>
              </div>

              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-[#556857]">
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
                <span className="text-[#647A67] font-bold flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
                  <span>Open Kit</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
