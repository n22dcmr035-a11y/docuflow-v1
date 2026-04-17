'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { CurrentlyReading } from '@/components/dashboard/CurrentlyReading';
import { BookshelfGrid } from '@/components/dashboard/BookshelfGrid';
import { UploadZone } from '@/components/dashboard/UploadZone';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { Document } from '@/types';
import { getCoverColor } from '@/lib/utils';
import { DEMO_DOCS } from '@/lib/demoData';

export default function DashboardPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [search, setSearch] = useState('');
  const [isDemo, setIsDemo] = useState(false);

  const handleSignOut = async () => {
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    router.push('/auth');
  };

  const fetchDocuments = useCallback(async () => {
    setLoading(true);

    if (!isSupabaseConfigured()) {
      setIsDemo(true);
      setDocuments(DEMO_DOCS);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    if (!supabase) { setDocuments(DEMO_DOCS); setIsDemo(true); setLoading(false); return; }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setIsDemo(true); setDocuments(DEMO_DOCS); setLoading(false); return; }

    type DocRow = Document & { reading_progress?: { scroll_pct: number; last_read: string }[] };
    const { data } = await supabase
      .from('documents')
      .select('*, reading_progress(scroll_pct, last_read)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      const docs = (data as DocRow[]).map((d) => ({
        ...d,
        scroll_pct: d.reading_progress?.[0]?.scroll_pct ?? 0,
        last_read: d.reading_progress?.[0]?.last_read,
      }));
      setDocuments(docs);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const handleUpload = async (file: File) => {
    if (isDemo) {
      // Demo mode: show alert and close the modal
      alert('Chức năng tải file đang bị vô hiệu hoá ở màn hình Demo. Vui lòng cài đặt thông tin Supabase của bạn vào file .env.local để bật tính năng này!');
      setShowUpload(false);
      return;
    }
    const supabase = createClient();
    if (!supabase) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Please log in to upload documents.');

    const ext = file.name.split('.').pop()!.toLowerCase() as 'pdf' | 'docx';
    const storagePath = `${user.id}/${Date.now()}-${file.name}`;

    const { error: storageErr } = await supabase.storage.from('documents').upload(storagePath, file);
    if (storageErr) throw new Error(storageErr.message);

    let parsedHtml: string | null = null;
    if (ext === 'docx') {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/parse', { method: 'POST', body: formData });
      if (res.ok) parsedHtml = (await res.json()).html;
    }

    const wordCount = parsedHtml
      ? parsedHtml.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length
      : 0;

    const title = file.name.replace(/\.(pdf|docx)$/i, '').replace(/[-_]/g, ' ');
    await supabase.from('documents').insert({
      user_id: user.id,
      title,
      file_name: file.name,
      file_type: ext,
      storage_path: storagePath,
      parsed_html: parsedHtml,
      word_count: wordCount,
      cover_color: getCoverColor(title),
    });

    setShowUpload(false);
    fetchDocuments();
  };

  const currentlyReading = [...documents]
    .filter((d) => (d.scroll_pct ?? 0) > 0 && (d.scroll_pct ?? 0) < 100)
    .sort((a, b) => new Date(b.last_read!).getTime() - new Date(a.last_read!).getTime())[0]
    ?? documents[0];

  const filtered = documents.filter((d) =>
    d.title.toLowerCase().includes(search.toLowerCase())
  );

  const avgProgress = documents.length
    ? Math.round(documents.reduce((s, d) => s + (d.scroll_pct ?? 0), 0) / documents.length)
    : 0;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#fdfbf7' }}>
      {/* Navbar */}
      <header className="sticky top-0 z-20 border-b border-[#e8e0d0] bg-white/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">📖</span>
            <span className="font-serif font-bold text-[#3d2f20] text-xl tracking-tight">DocuFlow</span>
          </div>

          <div className="flex-1 max-w-xs hidden sm:block">
            <input
              type="search"
              placeholder="Search documents…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-[#e8e0d0] bg-[#fdfbf7] px-4 py-1.5 text-sm font-sans text-[#3d2f20] placeholder-[#b0a090] focus:outline-none focus:border-[#b5d5e0] transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            {isDemo && (
              <span className="hidden sm:inline text-[10px] uppercase tracking-widest font-semibold bg-[#fef08a] text-[#3d2f20] px-2.5 py-1 rounded-full">
                Demo Mode
              </span>
            )}
            {!isDemo && (
              <button
                onClick={handleSignOut}
                className="hidden sm:block text-xs font-sans text-[#9c8870] hover:text-[#3d2f20] transition-colors px-2 py-1"
              >
                Sign Out
              </button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowUpload(true)}
              icon={<span className="text-base leading-none">＋</span>}
            >
              Upload
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-10">

        {/* Hero: Currently Reading */}
        {!loading && currentlyReading && (
          <section>
            <CurrentlyReading document={currentlyReading} />
          </section>
        )}

        {/* Bookshelf */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-serif font-bold text-[#3d2f20] text-2xl">
              My Library
              {documents.length > 0 && (
                <span className="ml-2 text-base font-sans font-normal text-[#9c8870]">
                  ({documents.length} books)
                </span>
              )}
            </h2>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowUpload(true)}>
                Add book
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-52 rounded-2xl bg-[#f5f0e8] animate-pulse" />
              ))}
            </div>
          ) : (
            <BookshelfGrid documents={filtered} />
          )}
        </section>

        {/* Quick stats */}
        {!loading && documents.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="grid grid-cols-3 gap-4"
          >
            {[
              { label: 'Books in Library', value: documents.length, icon: '📚' },
              { label: 'Completed', value: documents.filter((d) => (d.scroll_pct ?? 0) === 100).length, icon: '✅' },
              { label: 'Avg. Progress', value: `${avgProgress}%`, icon: '📊' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white rounded-2xl border border-[#e8e0d0] card-shadow p-5 text-center"
              >
                <div className="text-2xl mb-1">{stat.icon}</div>
                <div className="text-2xl font-bold font-serif text-[#3d2f20]">{stat.value}</div>
                <div className="text-xs font-sans text-[#9c8870] mt-0.5">{stat.label}</div>
              </div>
            ))}
          </motion.section>
        )}
      </main>

      {/* Upload Modal */}
      <Modal open={showUpload} onClose={() => setShowUpload(false)} title="Add to Library">
        {isDemo && (
          <div className="mb-4 text-sm text-[#6b5744] bg-[#fef08a] rounded-xl px-4 py-3 font-sans">
            ⚡ <strong>Demo Mode</strong> — Connect Supabase in <code>.env.local</code> to enable real uploads.
          </div>
        )}
        <UploadZone onUpload={handleUpload} />
      </Modal>
    </div>
  );
}
