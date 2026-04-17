'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { motion, AnimatePresence } from 'framer-motion';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const COLORS = [
  { key: 'yellow', bg: '#fef08a', border: '#ca8a04', text: '#78350f' },
  { key: 'green',  bg: '#bbf7d0', border: '#16a34a', text: '#14532d' },
  { key: 'blue',   bg: '#bfdbfe', border: '#2563eb', text: '#1e3a8a' },
  { key: 'pink',   bg: '#fbcfe8', border: '#db2777', text: '#831843' },
];

interface PdfAnnotation {
  id: string;
  text: string;
  note: string;
  color: string;
  pageNum: number;
  editing: boolean;
}

interface PdfReaderClientProps {
  url: string;
  documentId: string;
}

const storageKey = (docId: string) => `docuflow-pdf-ann-${docId}`;

export function PdfReaderClient({ url, documentId }: PdfReaderClientProps) {
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [currentPage, setCurrentPage] = useState(1);
  const [annotations, setAnnotations] = useState<PdfAnnotation[]>([]);
  const [panelOpen, setPanelOpen] = useState(true);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string; pageNum: number } | null>(null);
  const [activeColor, setActiveColor] = useState('yellow');

  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // ── Load from localStorage on mount ──
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey(documentId));
      if (saved) setAnnotations(JSON.parse(saved));
    } catch { /* ignore */ }
  }, [documentId]);

  // ── Persist to localStorage whenever annotations change ──
  useEffect(() => {
    localStorage.setItem(storageKey(documentId), JSON.stringify(annotations));
  }, [annotations, documentId]);

  // ── IntersectionObserver: current page indicator ──
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setCurrentPage(parseInt(entry.target.getAttribute('data-page') || '1'));
          }
        });
      },
      { rootMargin: '-40% 0px -40% 0px', threshold: 0 }
    );
    const refs = pageRefs.current;
    refs.forEach(el => observer.observe(el));
    return () => { refs.forEach(el => observer.unobserve(el)); };
  }, [numPages]);

  // ── Text selection → tooltip ──
  const handleMouseUp = useCallback((pageNum: number) => {
    requestAnimationFrame(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) { setTooltip(null); return; }
      const text = sel.toString().trim();
      if (!text) { setTooltip(null); return; }
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      setTooltip({ x: rect.left + rect.width / 2, y: rect.top - 60, text, pageNum });
    });
  }, []);

  // ── Highlight (no note) ──
  const handleHighlight = (color: string) => {
    if (!tooltip) return;
    setAnnotations(prev => [...prev, {
      id: `ann-${Date.now()}`,
      text: tooltip.text,
      note: '',
      color,
      pageNum: tooltip.pageNum,
      editing: false,
    }]);
    setActiveColor(color);
    window.getSelection()?.removeAllRanges();
    setTooltip(null);
    setPanelOpen(true);
  };

  // ── Highlight + open note editor ──
  const handleAddNote = () => {
    if (!tooltip) return;
    setAnnotations(prev => [...prev, {
      id: `ann-${Date.now()}`,
      text: tooltip.text,
      note: '',
      color: activeColor,
      pageNum: tooltip.pageNum,
      editing: true,
    }]);
    window.getSelection()?.removeAllRanges();
    setTooltip(null);
    setPanelOpen(true);
  };

  const saveNote = (id: string, note: string) =>
    setAnnotations(prev => prev.map(a => a.id === id ? { ...a, note, editing: false } : a));

  const deleteAnnotation = (id: string) =>
    setAnnotations(prev => prev.filter(a => a.id !== id));

  // ── customTextRenderer: wrap matching text in highlighted spans ──
  const customTextRenderer = useCallback(
    ({ str }: { str: string }) => {
      if (!str) return str;
      let result = str;
      // Find first annotation whose text appears in this text item
      for (const ann of annotations) {
        if (ann.text && result.includes(ann.text)) {
          const colorDef = COLORS.find(c => c.key === ann.color) ?? COLORS[0];
          const escaped = ann.text.replace(/[<>&"]/g, c => ({ '<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;' }[c] ?? c));
          result = result.replace(
            ann.text,
            `<mark style="background:${colorDef.bg};border-radius:2px;padding:0 1px;">${escaped}</mark>`
          );
          break;
        }
      }
      return result;
    },
    [annotations]
  );

  const zoomOut = () => setScale(s => parseFloat(Math.max(0.5, s - 0.15).toFixed(2)));
  const zoomIn  = () => setScale(s => parseFloat(Math.min(3, s + 0.15).toFixed(2)));

  return (
    <div className="flex gap-4 items-start relative">

      {/* ── PDF Pages ─────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        {/* Sticky toolbar */}
        <div className="sticky top-[60px] z-10 flex items-center justify-between bg-white/90 backdrop-blur border border-[#e8e0d0] rounded-2xl px-4 py-2 shadow-md mb-5">
          <span className="text-sm font-sans text-[#9c8870]">
            Page <strong className="text-[#3d2f20]">{currentPage}</strong>{numPages ? ` / ${numPages}` : ''}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={zoomOut} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[#f5f0e8] text-[#6b5744] transition-colors text-lg">−</button>
            <span className="text-xs text-[#9c8870] w-12 text-center">{Math.round(scale * 100)}%</span>
            <button onClick={zoomIn}  className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[#f5f0e8] text-[#6b5744] transition-colors text-lg">+</button>
          </div>
          {/* Notes toggle */}
          <button
            onClick={() => setPanelOpen(o => !o)}
            className="flex items-center gap-1.5 text-xs font-sans px-3 py-1.5 rounded-xl transition-colors"
            style={{
              backgroundColor: panelOpen ? '#fef08a' : '#f5f0e8',
              color: '#6b5744',
            }}
          >
            📝 Notes {annotations.length > 0 && <span className="bg-[#3d2f20] text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">{annotations.length}</span>}
            <span className="ml-1">{panelOpen ? '→' : '←'}</span>
          </button>
        </div>

        <Document
          file={url}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          loading={<div className="flex items-center justify-center h-96 text-[#b0a090] font-sans text-sm">Loading PDF…</div>}
          error={<div className="text-center text-red-500 font-sans text-sm p-8 bg-red-50 rounded-2xl">Failed to load PDF.</div>}
        >
          {Array.from({ length: numPages }, (_, i) => i + 1).map(pageNum => (
            <div
              key={pageNum}
              data-page={pageNum}
              ref={el => { if (el) pageRefs.current.set(pageNum, el); }}
              onMouseUp={() => handleMouseUp(pageNum)}
              className="mb-5 rounded-2xl overflow-hidden shadow-[0_2px_16px_rgba(60,40,20,0.08)]"
            >
              <Page
                pageNumber={pageNum}
                scale={scale}
                customTextRenderer={customTextRenderer}
              />
            </div>
          ))}
        </Document>
      </div>

      {/* ── Annotations Panel ─────────────────────────────────────── */}
      <AnimatePresence>
        {panelOpen && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 260 }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="flex-shrink-0 overflow-hidden"
          >
            <div className="w-[260px] sticky top-[60px] max-h-[calc(100vh-80px)] overflow-y-auto space-y-2 pr-1">
              {annotations.length === 0 ? (
                <div className="text-center py-10 text-[#c0b0a0] font-sans text-xs">
                  <div className="text-2xl mb-2">✏️</div>
                  Select text to add highlights & notes
                </div>
              ) : (
                annotations.map(ann => {
                  const c = COLORS.find(x => x.key === ann.color) ?? COLORS[0];
                  return (
                    <motion.div
                      key={ann.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="rounded-xl border p-2.5 text-xs font-sans"
                      style={{ backgroundColor: c.bg, borderColor: c.border, color: c.text }}
                    >
                      <p className="font-medium line-clamp-2 mb-1">"{ann.text}"</p>

                      {ann.editing ? (
                        <>
                          <textarea
                            id={`note-${ann.id}`}
                            autoFocus
                            defaultValue={ann.note}
                            placeholder="Write a note… (⌘+Enter to save)"
                            rows={3}
                            className="w-full rounded-lg bg-white/70 border border-white px-2 py-1 text-xs resize-none focus:outline-none"
                          />
                          <div className="flex gap-1 mt-1.5">
                            <button
                              onClick={() => saveNote(ann.id, (document.getElementById(`note-${ann.id}`) as HTMLTextAreaElement)?.value ?? '')}
                              className="flex-1 py-1 rounded-lg bg-[#3d2f20] text-white text-[10px] font-semibold"
                            >Save</button>
                            <button
                              onClick={() => deleteAnnotation(ann.id)}
                              className="px-2 py-1 rounded-lg bg-white/60 text-[10px]"
                            >✕</button>
                          </div>
                        </>
                      ) : (
                        <>
                          {ann.note && <p className="opacity-80 mt-1 whitespace-pre-wrap">{ann.note}</p>}
                          <div className="flex gap-2 mt-1.5">
                            <button onClick={() => setAnnotations(prev => prev.map(a => a.id === ann.id ? { ...a, editing: true } : a))} className="underline opacity-70 hover:opacity-100">
                              {ann.note ? 'Edit' : '+ Note'}
                            </button>
                            <button onClick={() => deleteAnnotation(ann.id)} className="ml-auto opacity-50 hover:opacity-100 hover:text-red-600">✕</button>
                          </div>
                        </>
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating Color Tooltip ────────────────────────────────── */}
      <AnimatePresence>
        {tooltip && (
          <motion.div
            data-tooltip="true"
            style={{ position: 'fixed', top: Math.max(8, tooltip.y), left: tooltip.x, transform: 'translateX(-50%)', zIndex: 9999 }}
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 480, damping: 28 }}
            onMouseDown={e => e.preventDefault()}
            className="bg-white border border-[#e8e0d0] rounded-2xl px-3 py-2 flex items-center gap-2 shadow-xl select-none"
          >
            {COLORS.map(c => (
              <button
                key={c.key}
                title={`Highlight ${c.key}`}
                onClick={() => handleHighlight(c.key)}
                className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-125 cursor-pointer"
                style={{ backgroundColor: c.bg, borderColor: activeColor === c.key ? '#3d2f20' : 'transparent' }}
              />
            ))}
            <div className="w-px h-5 bg-[#e8e0d0]" />
            <button
              onClick={handleAddNote}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#f5f0e8] hover:bg-[#fef08a] text-[#6b5744] text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
            >
              ✏️ Note
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
