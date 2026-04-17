'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { motion, AnimatePresence } from 'framer-motion';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfAnnotation {
  id: string;
  text: string;
  note: string;
  color: string;
  pageY: number; // relative Y position within the page for anchoring
  pageNum: number;
  editing: boolean;
}

const COLORS = [
  { key: 'yellow', bg: '#fef08a', border: '#ca8a04' },
  { key: 'green',  bg: '#bbf7d0', border: '#16a34a' },
  { key: 'blue',   bg: '#bfdbfe', border: '#2563eb' },
  { key: 'pink',   bg: '#fbcfe8', border: '#db2777' },
];

interface PdfReaderClientProps {
  url: string;
}

export function PdfReaderClient({ url }: PdfReaderClientProps) {
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [currentPage, setCurrentPage] = useState(1);
  const [annotations, setAnnotations] = useState<PdfAnnotation[]>([]);

  // Tooltip state
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string; pageNum: number; pageY: number } | null>(null);
  const [activeColor, setActiveColor] = useState('yellow');

  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const zoomOut = () => setScale(s => parseFloat(Math.max(0.5, s - 0.15).toFixed(2)));
  const zoomIn  = () => setScale(s => parseFloat(Math.min(3, s + 0.15).toFixed(2)));

  // Intersection observer — track current page
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const pageNum = parseInt(entry.target.getAttribute('data-page') || '1');
            setCurrentPage(pageNum);
          }
        });
      },
      { rootMargin: '-40% 0px -40% 0px', threshold: 0 }
    );
    pageRefs.current.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [numPages]);

  // Text selection → show tooltip
  const handleMouseUp = useCallback((e: React.MouseEvent, pageNum: number) => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      setTooltip(null);
      return;
    }
    const text = sel.toString().trim();
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const pageEl = pageRefs.current.get(pageNum);
    const pageRect = pageEl?.getBoundingClientRect();
    const pageY = pageRect ? rect.top - pageRect.top : 0;

    setTooltip({
      x: rect.left + rect.width / 2,
      y: rect.top - 56,
      text,
      pageNum,
      pageY,
    });
  }, []);

  const handleHighlight = (color: string) => {
    if (!tooltip) return;
    const id = `pdf-ann-${Date.now()}`;
    setAnnotations(prev => [...prev, {
      id,
      text: tooltip.text,
      note: '',
      color,
      pageY: tooltip.pageY,
      pageNum: tooltip.pageNum,
      editing: false,
    }]);
    setActiveColor(color);
    window.getSelection()?.removeAllRanges();
    setTooltip(null);
  };

  const handleAddNote = () => {
    if (!tooltip) return;
    const id = `pdf-ann-${Date.now()}`;
    setAnnotations(prev => [...prev, {
      id,
      text: tooltip.text,
      note: '',
      color: activeColor,
      pageY: tooltip.pageY,
      pageNum: tooltip.pageNum,
      editing: true,
    }]);
    window.getSelection()?.removeAllRanges();
    setTooltip(null);
  };

  const saveNote = (id: string, note: string) => {
    setAnnotations(prev => prev.map(a => a.id === id ? { ...a, note, editing: false } : a));
  };

  const deleteAnnotation = (id: string) => {
    setAnnotations(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className="flex gap-6 items-start">
      {/* ── Left: PDF Pages ── */}
      <div className="flex-1 min-w-0">
        {/* Sticky controls */}
        <div className="sticky top-[60px] z-10 flex items-center justify-between bg-white/90 backdrop-blur border border-[#e8e0d0] rounded-2xl px-4 py-2 shadow-md mb-4">
          <span className="text-sm font-sans text-[#9c8870]">
            Page <strong className="text-[#3d2f20]">{currentPage}</strong> of {numPages || '…'}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={zoomOut} className="w-8 h-8 flex items-center justify-center rounded-xl text-[#6b5744] hover:bg-[#f5f0e8] transition-colors text-lg">−</button>
            <span className="text-xs text-[#9c8870] w-12 text-center">{Math.round(scale * 100)}%</span>
            <button onClick={zoomIn} className="w-8 h-8 flex items-center justify-center rounded-xl text-[#6b5744] hover:bg-[#f5f0e8] transition-colors text-lg">+</button>
          </div>
          <span className="text-xs text-[#b0a090] font-sans hidden sm:block">Select text to highlight</span>
        </div>

        {/* All pages */}
        <div ref={containerRef}>
          <Document
            file={url}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            loading={
              <div className="flex items-center justify-center h-96 text-[#b0a090] font-sans text-sm">
                Loading PDF…
              </div>
            }
          >
            {Array.from({ length: numPages }, (_, i) => i + 1).map(pageNum => (
              <div
                key={pageNum}
                data-page={pageNum}
                ref={el => { if (el) pageRefs.current.set(pageNum, el); }}
                onMouseUp={(e) => handleMouseUp(e, pageNum)}
                className="mb-6 rounded-2xl overflow-hidden shadow-[0_2px_16px_rgba(60,40,20,0.08)] relative"
              >
                <Page
                  pageNumber={pageNum}
                  scale={scale}
                />
              </div>
            ))}
          </Document>
        </div>
      </div>

      {/* ── Right: Annotations Panel ── */}
      {annotations.length > 0 && (
        <div className="w-72 flex-shrink-0 space-y-3 sticky top-[60px] max-h-[calc(100vh-80px)] overflow-y-auto">
          <h3 className="font-serif font-bold text-[#3d2f20] text-sm mb-2">📝 Notes</h3>
          <AnimatePresence>
            {annotations.map(ann => {
              const colorDef = COLORS.find(c => c.key === ann.color) ?? COLORS[0];
              return (
                <motion.div
                  key={ann.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="rounded-2xl border p-3 text-sm font-sans"
                  style={{ backgroundColor: colorDef.bg, borderColor: colorDef.border }}
                >
                  <p className="text-[#3d2f20] font-medium line-clamp-2 text-xs mb-1.5">
                    "{ann.text}"
                  </p>
                  {ann.editing ? (
                    <div>
                      <textarea
                        autoFocus
                        defaultValue={ann.note}
                        placeholder="Add a note…"
                        rows={3}
                        className="w-full rounded-xl bg-white/70 border border-white/80 px-2.5 py-1.5 text-xs text-[#3d2f20] resize-none focus:outline-none focus:ring-1 focus:ring-[#b5d5e0]"
                        onKeyDown={e => {
                          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                            saveNote(ann.id, (e.target as HTMLTextAreaElement).value);
                          }
                        }}
                        id={`note-${ann.id}`}
                      />
                      <div className="flex gap-1.5 mt-1.5">
                        <button
                          onClick={() => saveNote(ann.id, (document.getElementById(`note-${ann.id}`) as HTMLTextAreaElement)?.value ?? '')}
                          className="flex-1 py-1 rounded-lg bg-[#3d2f20] text-white text-[10px] font-semibold"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => deleteAnnotation(ann.id)}
                          className="px-2 py-1 rounded-lg bg-white/60 text-[#9c8870] text-[10px]"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {ann.note && <p className="text-[#6b5744] text-xs mt-1">{ann.note}</p>}
                      <div className="flex gap-1.5 mt-2">
                        <button
                          onClick={() => setAnnotations(prev => prev.map(a => a.id === ann.id ? { ...a, editing: true } : a))}
                          className="text-[10px] text-[#6b5744] hover:text-[#3d2f20] underline"
                        >
                          {ann.note ? 'Edit' : 'Add note'}
                        </button>
                        <button onClick={() => deleteAnnotation(ann.id)} className="text-[10px] text-[#b0a090] hover:text-red-500 ml-auto">✕</button>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ── Floating Tooltip ── */}
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
            className="bg-white border border-[#e8e0d0] rounded-2xl px-3 py-2 flex items-center gap-2 shadow-lg select-none"
          >
            {COLORS.map(c => (
              <button
                key={c.key}
                onClick={() => handleHighlight(c.key)}
                className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-125 cursor-pointer"
                style={{ backgroundColor: c.bg, borderColor: activeColor === c.key ? '#3d2f20' : 'transparent' }}
              />
            ))}
            <div className="w-px h-5 bg-[#e8e0d0]" />
            <button
              onClick={handleAddNote}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#f5f0e8] hover:bg-[#fef08a] text-[#6b5744] text-xs font-sans font-medium transition-colors cursor-pointer whitespace-nowrap"
            >
              ✏️ Note
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
