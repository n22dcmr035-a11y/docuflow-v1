'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { DocxReader } from '@/components/reader/DocxReader';
import { PdfReader } from '@/components/reader/PdfReader';
import { useReadingProgress } from '@/hooks/useReadingProgress';
import { useAnnotations } from '@/hooks/useAnnotations';
import { Button } from '@/components/ui/Button';
import type { Document } from '@/types';
import { DEMO_DOCS } from '@/lib/demoData';

export default function ReadPage() {
  const { docId } = useParams<{ docId: string }>();
  // We don't want to show an array of docs here, just one. We extract docId directly.
  const actualDocId = Array.isArray(docId) ? docId[0] : docId;

  const router = useRouter();
  const clientRef = useRef(isSupabaseConfigured() ? createClient() : null);
  const [doc, setDoc] = useState<Document | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const { loadAnnotations } = useAnnotations(actualDocId);
  useReadingProgress(actualDocId);

  useEffect(() => {
    (async () => {
      const supabase = clientRef.current;
      
      if (!supabase) {
        // DEMO MODE
        const demoDoc = DEMO_DOCS.find(d => d.id === actualDocId);
        if (demoDoc) {
          setDoc(demoDoc);
          if (demoDoc.file_type === 'pdf') {
             // We can't really load PDF from supabase in demo mode without the real PDF file
             // We'll just show a placeholder error or use a local one if we had it
             setPdfUrl(null);
          }
          await loadAnnotations();
        }
        setLoading(false);
        return;
      }

      // REAL SUPABASE MODE
      const { data } = await supabase
        .from('documents')
        .select('*')
        .eq('id', actualDocId)
        .single();

      if (data) {
        setDoc(data as Document);
        if (data.file_type === 'pdf') {
          const { data: signedData } = await supabase.storage
            .from('documents')
            .createSignedUrl(data.storage_path, 3600);
          if (signedData) setPdfUrl(signedData.signedUrl);
        }
        await loadAnnotations();
      }
      setLoading(false);
    })();
  }, [actualDocId, loadAnnotations]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#fdfbf7' }}>
        <div className="text-center">
          <div className="text-4xl mb-3 animate-bounce">📖</div>
          <p className="text-[#9c8870] font-sans text-sm">Opening document…</p>
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4" style={{ backgroundColor: '#fdfbf7' }}>
        <div className="text-4xl">😔</div>
        <p className="text-[#6b5744] font-sans">Document not found.</p>
        <Button variant="ghost" onClick={() => router.push('/dashboard')}>← Back to Library</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#fdfbf7' }}>
      {/* Reader Header */}
      <header className="sticky top-0 z-20 border-b border-[#e8e0d0] bg-white/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-[#9c8870] hover:text-[#3d2f20] transition-colors font-sans text-sm"
          >
            ← Library
          </button>
          <div
            className="w-4 h-4 rounded-sm flex-shrink-0"
            style={{ backgroundColor: doc.cover_color }}
          />
          <h1 className="font-serif font-bold text-[#3d2f20] text-base truncate">{doc.title}</h1>
          <span className="ml-auto text-xs uppercase tracking-widest text-[#b0a090] font-sans">
            {doc.file_type}
          </span>
        </div>
      </header>

      {/* Main reading area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        {doc.file_type === 'docx' && doc.parsed_html ? (
          <DocxReader html={doc.parsed_html} documentId={doc.id} />
        ) : doc.file_type === 'pdf' ? (
          pdfUrl ? <PdfReader url={pdfUrl} /> : <div className="text-center py-24 text-[#b0a090] font-sans text-sm">PDF preview is not available in Demo Mode. Connect Supabase to upload and view real PDFs.</div>
        ) : (
          <div className="text-center py-24 text-[#b0a090] font-sans text-sm">
            Could not load document content.
          </div>
        )}
      </main>
    </div>
  );
}
