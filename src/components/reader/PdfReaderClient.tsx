'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { motion, AnimatePresence } from 'framer-motion';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

/* ─── Types ────────────────────────────────────────────────────────── */

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

interface TocItem {
  title: string;
  pageNum: number;
  level: number;
  children?: TocItem[];
}

interface PdfReaderClientProps {
  url: string;
  documentId: string;
}

const storageKey = (id: string) => `docuflow-pdf-ann-${id}`;

/* ─── TOC Resolver ─────────────────────────────────────────────────── */

async function resolveOutline(
  outline: { title: string; dest: unknown; items?: unknown[] }[],
  pdf: PDFDocumentProxy,
  level = 0
): Promise<TocItem[]> {
  const results: TocItem[] = [];
  for (const item of outline) {
    let pageNum = 1;
    try {
      let dest = item.dest;
      if (typeof dest === 'string') dest = await pdf.getDestination(dest);
      if (Array.isArray(dest) && dest[0]) {
        const pageIndex = await pdf.getPageIndex(dest[0] as object);
        pageNum = pageIndex + 1;
      }
    } catch { /* fallback to 1 */ }

    const children = item.items && (item.items as typeof outline).length > 0
      ? await resolveOutline(item.items as typeof outline, pdf, level + 1)
      : [];

    results.push({ title: item.title, pageNum, level, children });
  }
  return results;
}

/* ─── Component ────────────────────────────────────────────────────── */

export function PdfReaderClient({ url, documentId }: PdfReaderClientProps) {
  const [numPages, setNumPages]     = useState(0);
  const [scale, setScale]           = useState(1.2);
  const [currentPage, setCurrentPage] = useState(1);
  const [annotations, setAnnotations] = useState<PdfAnnotation[]>([]);
  const [toc, setToc]               = useState<TocItem[]>([]);
  const [tocOpen, setTocOpen]       = useState(true);
  const [panelOpen, setPanelOpen]   = useState(true);
  const [tooltip, setTooltip]       = useState<{ x: number; y: number; text: string; pageNum: number } | null>(null);
  const [activeColor, setActiveColor] = useState('yellow');
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  /* ── Persist annotations ── */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey(documentId));
      if (saved) setAnnotations(JSON.parse(saved));
    } catch { /* ignore */ }
  }, [documentId]);

  useEffect(() => {
    localStorage.setItem(storageKey(documentId), JSON.stringify(annotations));
  }, [annotations, documentId]);

  /* ── Scroll to a page ── */
  const scrollToPage = useCallback((pageNum: number) => {
    const el = pageRefs.current.get(pageNum);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  /* ── IntersectionObserver: current page ── */
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) setCurrentPage(parseInt(e.target.getAttribute('data-page') || '1'));
      }),
      { rootMargin: '-35% 0px -35% 0px', threshold: 0 }
    );
    const refs = pageRefs.current;
    refs.forEach(el => observer.observe(el));
    return () => refs.forEach(el => observer.unobserve(el));
  }, [numPages]);

  /* ── PDF loaded: extract TOC ── */
  const onDocumentLoad = useCallback(async ({ numPages }: { numPages: number }, pdf: PDFDocumentProxy) => {
    setNumPages(numPages);
    try {
      const rawOutline = await pdf.getOutline();
      if (rawOutline && rawOutline.length > 0) {
        const resolved = await resolveOutline(
          rawOutline as { title: string; dest: unknown; items?: unknown[] }[],
          pdf
        );
        setToc(resolved);
      }
    } catch { setToc([]); }
  }, []);

  /* ── Text selection ── */
  const handleMouseUp = useCallback((pageNum: number) => {
    requestAnimationFrame(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) { setTooltip(null); return; }
      const text = sel.toString().trim();
      if (!text) { setTooltip(null); return; }
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      setTooltip({ x: rect.left + rect.width / 2, y: rect.top - 64, text, pageNum });
    });
  }, []);

  /* ── Highlight ── */
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

  const handleAddNote = () => {
    if (!tooltip) return;
    const id = `ann-${Date.now()}`;
    setAnnotations(prev => [...prev, {
      id,
      text: tooltip.text,
      note: '',
      color: activeColor,
      pageNum: tooltip.pageNum,
      editing: true,
    }]);
    window.getSelection()?.removeAllRanges();
    setTooltip(null);
    setPanelOpen(true);
    setActiveNoteId(id);
  };

  const saveNote = (id: string, note: string) =>
    setAnnotations(prev => prev.map(a => a.id === id ? { ...a, note, editing: false } : a));

  const deleteAnnotation = (id: string) =>
    setAnnotations(prev => prev.filter(a => a.id !== id));

  /* ── Visual highlight on text layer ── */
  const customTextRenderer = useCallback(
    ({ str }: { str: string }) => {
      if (!str) return str;
      let result = str;

      for (const ann of annotations) {
        if (!ann.text) continue;
        const colorDef = COLORS.find(c => c.key === ann.color) ?? COLORS[0];
        const esc = (s: string) => s.replace(/[<>&"]/g, c =>
          ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c] ?? c));

        // full text item is within the annotation span
        if (ann.text.includes(str)) {
          result = `<mark style="background:${colorDef.bg};border-radius:2px;padding:0 1px;color:inherit;">${esc(str)}</mark>`;
          break;
        }
        // annotation text is within the text item
        if (str.includes(ann.text)) {
          result = str.replace(
            ann.text,
            `<mark style="background:${colorDef.bg};border-radius:2px;padding:0 1px;color:inherit;">${esc(ann.text)}</mark>`
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

  /* ── TOC Item Renderer ── */
  const TocNode = ({ item }: { item: TocItem }) => (
    <li>
      <button
        onClick={() => scrollToPage(item.pageNum)}
        className="w-full text-left px-2 py-1 rounded-lg text-xs font-sans transition-colors hover:bg-[#f5f0e8] group"
        style={{ paddingLeft: `${8 + item.level * 12}px` }}
      >
        <span className="text-[#6b5744] group-hover:text-[#3d2f20] line-clamp-2 leading-snug">
          {item.title}
        </span>
        <span className="text-[#c0b0a0] ml-1 text-[10px]">{item.pageNum}</span>
      </button>
      {item.children && item.children.length > 0 && (
        <ul>{item.children.map((child, i) => <TocNode key={i} item={child} />)}</ul>
      )}
    </li>
  );

  /* ── Render ── */
  return (
    <div className="flex gap-3 items-start">

      {/* ════ LEFT: Table of Contents ════════════════════════════════ */}
      <AnimatePresence initial={false}>
        {tocOpen && toc.length > 0 && (
          <motion.div
            key="toc"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 220 }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            className="flex-shrink-0 overflow-hidden"
          >
            <div className="w-[220px] sticky top-[60px] max-h-[calc(100vh-80px)] overflow-y-auto bg-white border border-[#e8e0d0] rounded-2xl shadow-sm">
              <div className="px-3 pt-3 pb-2 border-b border-[#f0ebe0] flex items-center justify-between">
                <span className="text-xs font-semibold text-[#3d2f20] font-sans uppercase tracking-wider">Contents</span>
                <button onClick={() => setTocOpen(false)} className="text-[#c0b0a0] hover:text-[#6b5744] text-xs">✕</button>
              </div>
              <ul className="py-2 space-y-0.5 px-1">
                {toc.map((item, i) => <TocNode key={i} item={item} />)}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════ CENTER: PDF Pages ══════════════════════════════════════ */}
      <div className="flex-1 min-w-0">
        {/* Toolbar */}
        <div className="sticky top-[60px] z-10 flex items-center justify-between bg-white/90 backdrop-blur border border-[#e8e0d0] rounded-2xl px-3 py-2 shadow-md mb-5 gap-2 flex-wrap">
          {/* TOC toggle */}
          {toc.length > 0 && (
            <button
              onClick={() => setTocOpen(o => !o)}
              title="Toggle Table of Contents"
              className="text-xs px-2.5 py-1.5 rounded-xl hover:bg-[#f5f0e8] text-[#6b5744] transition-colors font-sans whitespace-nowrap"
            >
              ☰ TOC
            </button>
          )}

          {/* Page indicator */}
          <span className="text-sm font-sans text-[#9c8870] flex-1 text-center">
            Page <strong className="text-[#3d2f20]">{currentPage}</strong>{numPages ? ` / ${numPages}` : ''}
          </span>

          {/* Zoom */}
          <div className="flex items-center gap-1">
            <button onClick={zoomOut} className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-[#f5f0e8] text-[#6b5744] transition-colors">−</button>
            <span className="text-xs text-[#9c8870] w-10 text-center">{Math.round(scale * 100)}%</span>
            <button onClick={zoomIn}  className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-[#f5f0e8] text-[#6b5744] transition-colors">+</button>
          </div>

          {/* Notes toggle */}
          <button
            onClick={() => setPanelOpen(o => !o)}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl transition-colors font-sans whitespace-nowrap"
            style={{ backgroundColor: panelOpen ? '#fef08a' : '#f5f0e8', color: '#6b5744' }}
          >
            📝{annotations.length > 0 && <span className="bg-[#3d2f20] text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] ml-0.5">{annotations.length}</span>}
            <span className="ml-0.5">{panelOpen ? '→' : '←'}</span>
          </button>
        </div>

        {/* Document */}
        <Document
          file={url}
          onLoadSuccess={(proxy) => onDocumentLoad(proxy, proxy as unknown as PDFDocumentProxy)}
          loading={<div className="flex items-center justify-center h-96 text-[#b0a090] font-sans text-sm">Loading PDF…</div>}
          error={<div className="text-center text-red-500 font-sans text-sm p-8 bg-red-50 rounded-2xl">Failed to load PDF.</div>}
        >
          {Array.from({ length: numPages }, (_, i) => i + 1).map(pageNum => (
            <div
              key={pageNum}
              data-page={pageNum}
              ref={el => { if (el) pageRefs.current.set(pageNum, el); }}
              onMouseUp={() => handleMouseUp(pageNum)}
              className="mb-5 rounded-2xl overflow-hidden shadow-[0_2px_16px_rgba(60,40,20,0.08)] cursor-text"
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

      {/* ════ RIGHT: Annotations Panel ══════════════════════════════ */}
      <AnimatePresence initial={false}>
        {panelOpen && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 248 }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            className="flex-shrink-0 overflow-hidden"
          >
            <div className="w-[248px] sticky top-[60px] max-h-[calc(100vh-80px)] overflow-y-auto space-y-2 pr-0.5">
              {annotations.length === 0 ? (
                <div className="text-center py-12 text-[#c0b0a0] font-sans text-xs bg-white border border-[#e8e0d0] rounded-2xl p-4">
                  <div className="text-2xl mb-2">✏️</div>
                  Select text to highlight &amp; add notes
                </div>
              ) : (
                annotations.map(ann => {
                  const c = COLORS.find(x => x.key === ann.color) ?? COLORS[0];
                  const isActive = activeNoteId === ann.id;
                  return (
                    <motion.div
                      key={ann.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="rounded-xl border p-2.5 text-xs font-sans transition-shadow"
                      style={{
                        backgroundColor: c.bg,
                        borderColor: isActive ? c.border : `${c.border}66`,
                        color: c.text,
                        boxShadow: isActive ? `0 0 0 2px ${c.border}` : 'none',
                      }}
                    >
                      {/* Click quote → scroll to that page */}
                      <button
                        onClick={() => {
                          scrollToPage(ann.pageNum);
                          setActiveNoteId(ann.id);
                        }}
                        className="w-full text-left font-medium line-clamp-2 mb-1 hover:underline cursor-pointer"
                        title={`Go to page ${ann.pageNum}`}
                      >
                        "{ann.text}"
                        <span className="ml-1 opacity-50 text-[10px] font-normal">p.{ann.pageNum}</span>
                      </button>

                      {ann.editing ? (
                        <>
                          <textarea
                            id={`note-${ann.id}`}
                            autoFocus
                            defaultValue={ann.note}
                            placeholder="Write a note…"
                            rows={3}
                            className="w-full rounded-lg bg-white/70 border border-white px-2 py-1 text-xs resize-none focus:outline-none"
                          />
                          <div className="flex gap-1 mt-1.5">
                            <button
                              onClick={() => {
                                saveNote(ann.id, (document.getElementById(`note-${ann.id}`) as HTMLTextAreaElement)?.value ?? '');
                                setActiveNoteId(null);
                              }}
                              className="flex-1 py-1 rounded-lg bg-[#3d2f20] text-white text-[10px] font-semibold"
                            >Save</button>
                            <button onClick={() => deleteAnnotation(ann.id)} className="px-2 py-1 rounded-lg bg-white/60 text-[10px]">✕</button>
                          </div>
                        </>
                      ) : (
                        <>
                          {ann.note && <p className="opacity-80 mt-1 whitespace-pre-wrap">{ann.note}</p>}
                          <div className="flex gap-2 mt-1.5 items-center">
                            <button
                              onClick={() => {
                                setAnnotations(prev => prev.map(a => a.id === ann.id ? { ...a, editing: true } : a));
                                setActiveNoteId(ann.id);
                              }}
                              className="underline opacity-60 hover:opacity-100 text-[10px]"
                            >
                              {ann.note ? 'Edit' : '+ Note'}
                            </button>
                            <button onClick={() => deleteAnnotation(ann.id)} className="ml-auto opacity-40 hover:opacity-100 hover:text-red-600 text-[10px]">✕</button>
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

      {/* ════ Floating Tooltip ══════════════════════════════════════ */}
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
