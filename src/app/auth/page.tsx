'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';

type Mode = 'login' | 'signup';

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const emailRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const supabase = createClient();
    if (!supabase) {
      setError('Supabase is not configured.');
      setLoading(false);
      return;
    }

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      } else {
        router.push('/dashboard');
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else {
        setSuccess('Account created! Check your email to confirm, then log in.');
        setMode('login');
      }
    }
    setLoading(false);
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setError('');
    setSuccess('');
    setTimeout(() => emailRef.current?.focus(), 50);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: '#fdfbf7' }}
    >
      {/* Background blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-30" style={{ background: 'radial-gradient(circle, #b5d5e0, transparent)' }} />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-30" style={{ background: 'radial-gradient(circle, #d4e0b5, transparent)' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">📖</div>
          <h1 className="font-serif font-bold text-[#3d2f20] text-3xl tracking-tight">DocuFlow</h1>
          <p className="text-[#9c8870] font-sans text-sm mt-1">Your personal reading space</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl border border-[#e8e0d0] shadow-[0_8px_40px_rgba(60,40,20,0.08)] p-8">
          {/* Mode Tabs */}
          <div className="flex rounded-2xl bg-[#f5f0e8] p-1 mb-7">
            {(['login', 'signup'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className="flex-1 py-2 rounded-xl text-sm font-sans font-medium transition-all"
                style={{
                  backgroundColor: mode === m ? 'white' : 'transparent',
                  color: mode === m ? '#3d2f20' : '#9c8870',
                  boxShadow: mode === m ? '0 1px 4px rgba(60,40,20,0.1)' : 'none',
                }}
              >
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-sans font-semibold text-[#6b5744] uppercase tracking-wider mb-1.5">
                Email
              </label>
              <input
                ref={emailRef}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full rounded-2xl border border-[#e8e0d0] bg-[#fdfbf7] px-4 py-2.5 text-sm font-sans text-[#3d2f20] placeholder-[#c0b0a0] focus:outline-none focus:border-[#b5d5e0] focus:ring-2 focus:ring-[#b5d5e0]/30 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-sans font-semibold text-[#6b5744] uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
                className="w-full rounded-2xl border border-[#e8e0d0] bg-[#fdfbf7] px-4 py-2.5 text-sm font-sans text-[#3d2f20] placeholder-[#c0b0a0] focus:outline-none focus:border-[#b5d5e0] focus:ring-2 focus:ring-[#b5d5e0]/30 transition-all"
              />
            </div>

            {/* Error / Success */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-sm text-[#be123c] bg-[#ffe4e6] rounded-xl px-4 py-2.5 font-sans"
                >
                  {error}
                </motion.div>
              )}
              {success && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-sm text-[#166534] bg-[#dcfce7] rounded-xl px-4 py-2.5 font-sans"
                >
                  {success}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-2xl font-sans font-semibold text-sm transition-all mt-2"
              style={{
                backgroundColor: loading ? '#d4e0b5' : '#3d2f20',
                color: loading ? '#9c8870' : 'white',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {/* Demo Mode link */}
          <div className="mt-6 pt-5 border-t border-[#f0ebe0] text-center">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-xs font-sans text-[#b0a090] hover:text-[#6b5744] transition-colors"
            >
              Continue in Demo Mode →
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
