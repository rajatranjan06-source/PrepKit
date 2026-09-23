'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserPlus, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      if (data.token) {
        localStorage.setItem('prepkit_token', data.token);
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 font-sans">
      <div className="bg-white p-8 rounded-2xl border border-[#D6E0C5] shadow-xs space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#EBF0DF] border border-[#D6E0C5] flex items-center justify-center text-[#647A67] mx-auto">
            <UserPlus className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-[#232D24]">Create Your Account</h1>
          <p className="text-[#556857] text-sm">Start generating personalized interview prep kits</p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#556857] uppercase tracking-wider mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Alex Smith"
              className="w-full px-4 py-2.5 rounded-xl bg-[#F7F7EE] border border-[#D6E0C5] text-[#232D24] placeholder-[#556857] focus:outline-none focus:ring-2 focus:ring-[#9CB495] text-sm font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#556857] uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-2.5 rounded-xl bg-[#F7F7EE] border border-[#D6E0C5] text-[#232D24] placeholder-[#556857] focus:outline-none focus:ring-2 focus:ring-[#9CB495] text-sm font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#556857] uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full px-4 py-2.5 rounded-xl bg-[#F7F7EE] border border-[#D6E0C5] text-[#232D24] placeholder-[#556857] focus:outline-none focus:ring-2 focus:ring-[#9CB495] text-sm font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#647A67] hover:bg-[#4E6151] text-white font-bold text-sm transition-all shadow-xs disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Register Account'}
          </button>
        </form>

        <div className="text-center text-xs text-[#556857]">
          Already have an account?{' '}
          <Link href="/login" className="text-[#647A67] font-bold hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
