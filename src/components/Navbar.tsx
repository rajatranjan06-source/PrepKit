'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Sparkles, BookOpen, PlusCircle, LogOut, User, Menu, X } from 'lucide-react';

export default function Navbar() {
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('prepkit_token') : null;
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch('/api/auth/me', { headers })
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      })
      .catch(() => setUser(null));
  }, [pathname]);

  const handleLogout = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('prepkit_token');
    }
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-50 bg-[#F7F7EE]/90 backdrop-blur-md border-b border-[#D6E0C5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#647A67] flex items-center justify-center shadow-sm text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-xl font-extrabold text-[#232D24] tracking-tight">
              PrepKit
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center space-x-6">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className={`flex items-center space-x-2 text-sm font-semibold transition-colors ${
                    pathname === '/dashboard' ? 'text-[#647A67]' : 'text-[#4E6151] hover:text-[#232D24]'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Dashboard</span>
                </Link>

                <Link
                  href="/kits/new"
                  className={`flex items-center space-x-2 text-sm font-semibold px-4 py-2.5 rounded-xl bg-[#647A67] hover:bg-[#4E6151] text-white transition-all shadow-xs ${
                    pathname === '/kits/new' ? 'ring-2 ring-[#9CB495]' : ''
                  }`}
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Create Kit</span>
                </Link>

                <div className="flex items-center space-x-3 pl-4 border-l border-[#D6E0C5]">
                  <div className="flex items-center space-x-2 text-[#232D24] text-sm font-semibold">
                    <User className="w-4 h-4 text-[#647A67]" />
                    <span>{user.name}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-[#647A67] hover:text-rose-600 rounded-lg hover:bg-[#EBF0DF] transition-colors"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-semibold text-[#4E6151] hover:text-[#232D24] transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="text-sm font-semibold px-4 py-2.5 rounded-xl bg-[#647A67] hover:bg-[#4E6151] text-white transition-all shadow-xs"
                >
                  Get Started
                </Link>
              </>
            )}
          </nav>

          {/* Mobile menu toggle */}
          <div className="md:hidden">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 text-[#4E6151] hover:text-[#232D24] rounded-lg hover:bg-[#EBF0DF]"
            >
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {menuOpen && (
        <div className="md:hidden bg-[#F7F7EE] border-b border-[#D6E0C5] px-4 pt-2 pb-4 space-y-3">
          {user ? (
            <>
              <Link
                href="/dashboard"
                onClick={() => setMenuOpen(false)}
                className="block py-2 text-[#4E6151] hover:text-[#647A67] font-semibold"
              >
                Dashboard
              </Link>
              <Link
                href="/kits/new"
                onClick={() => setMenuOpen(false)}
                className="block py-2 text-[#647A67] font-bold"
              >
                + Create Kit
              </Link>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  handleLogout();
                }}
                className="w-full text-left py-2 text-rose-600 font-semibold"
              >
                Sign Out ({user.name})
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="block py-2 text-[#4E6151] font-semibold"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                onClick={() => setMenuOpen(false)}
                className="block py-2 text-[#647A67] font-bold"
              >
                Register
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
