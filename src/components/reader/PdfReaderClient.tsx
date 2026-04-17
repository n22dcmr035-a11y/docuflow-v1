'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { motion, AnimatePresence } from 'framer-motion';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

/* ────────────────── Types ───────────────────────────────────────────── */

const COLORS = [
  { key: 'yellow', bg: 'rgba(253,224,71,0.45)',  solid: '#fef08a', border: '#ca8a04', text: '#78350f' },
  { key: 'green',  bg: 'rgba(74,222,128,0.35)',  solid: '#bbf7d0', border: '#16a34a', text: '#14532d' },
  { key: 'blue',   bg: 'rgba(96,165,250,0.35)',  solid: '#bfdbfe', border: '#2563eb', text: '#1e3a8a' },
  { key: 'pink',   bg: 'rgba(244,114,182,0.35)', solid: '#fbcfe8', border: '#db2777', text: '#831843' },
];

/** A highlight rectangle stored as percentages of page size */
interface HRect { x: number; y: number; w: number; h: number; }

interface PdfAnnotation {
  id: string;
  text: string;
  note: string;
  color: string;
  pageNum: number;
  rects: HRect[]; // pixel-accurate, page-relative % coords
}

interface TocItem { title: string; pageNum: number; level: number; children?: TocItem[]; }

interface PdfReaderClientProps { url: string; documentId: string; }

const storageKey = (id: string) => `docuflow-pdf-ann-${id}`;

/* ────────────────── TOC resolver ────────────────────────────────────── */
async function resolveOutline(
  outline: { title: string; dest: unknown; items?: unknown[] }[],
  pdf: PDFDocumentProxy, level = 0
): Promise<TocItem[]> {
  const out: TocItem[] = [];
  for (const item of outline) {
    let pageNum = 1;
    try {
      let dest = item.dest;
      if (typeof dest === 'string') dest = await pdf.getDestination(dest);
      if (Array.isArray(dest) && dest[0]) pageNum = await pdf.getPageIndex(dest[0] as object) + 1;
    } catch { /* keep 1 */ }
    const children = item.items && (item.items as typeof outline).length > 0
      ? await resolveOutline(item.items as typeof outline, pdf, level + 1) : [];
    out.push({ title: item.title, pageNum, level, children });
  }
  return out;
}

/* ────────────────── Component ───────────────────────────────────────── */
export function PdfReaderClient({ url, documentId }: PdfReaderClientProps) {
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [currentPage, setCurrentPage] = useState(1);
  const [annotations, setAnnotations] = useState<PdfAnnotation[]>([]);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [tocOpen, setTocOpen] = useState(true);
  const [notesOpen, setNotesOpen] = useState(false);
  const [activeColor, setActiveColor] = useState('yellow');
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string; pageNum: number; rects: HRect[] } | null>(null);
  const [noteTarget, setNoteTarget] = useState<PdfAnnotation | null>(null);

  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // ── Persist ──
  useEffect(() => {
    try { const s = localStorage.getItem(storageKey(documentId)); if (s) setAnnotations(JSON.parse(s)); } catch { /* */ }
  }, [documentId]);
  useEffect(() => { localStorage.setItem(storageKey(documentId), JSON.stringify(annotations)); }, [annotations, documentId]);

  // ── Scroll to page ──
  const scrollToPage = useCallback((p: number) => {
    pageRefs.current.get(p)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // ── IntersectionObserver ──
  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) setCurrentPage(parseInt(e.target.getAttribute('data-page') || '1')); });
    }, { rootMargin: '-35% 0px -35% 0px' });
    const refs = pageRefs.current;
    refs.forEach(el => obs.observe(el));
    return () => refs.forEach(el => obs.unobserve(el));
  }, [numPages]);

  // ── PDF outline ──
  const onDocumentLoad = useCallback(async (proxy: { numPages: number }) => {
    setNumPages(proxy.numPages);
    try {
      const pdf = proxy as unknown as PDFDocumentProxy;
      const raw = await pdf.getOutline();
      if (raw?.length) setToc(await resolveOutline(raw as { title: string; dest: unknown; items?: unknown[] }[], pdf));
    } catch { setToc([]); }
  }, []);

  // ── Selection → pixel-accurate rects ──
  const handleMouseUp = useCallback((pageNum: number) => {
    requestAnimationFrame(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) { setTooltip(null); return; }
      const text = sel.toString().trim();
      if (!text) { setTooltip(null); return; }

      const pageEl = pageRefs.current.get(pageNum);
      if (!pageEl) { setTooltip(null); return; }
      const pageRect = pageEl.getBoundingClientRect();

      // Convert each client rect to page-relative percentages
      const range = sel.getRangeAt(0);
      const clientRects = Array.from(range.getClientRects());
      const rects: HRect[] = clientRects
        .filter(r => r.width > 0 && r.height > 0)
        .map(r => ({
          x: ((r.left - pageRect.left) / pageRect.width) * 100,
          y: ((r.top  - pageRect.top)  / pageRect.height) * 100,
          w: (r.width  / pageRect.width)  * 100,
          h: (r.height / pageRect.height) * 100,
        }));

      if (!rects.length) { setTooltip(null); return; }

      // Position tooltip above the first rect
      const first = clientRects[0];
      setTooltip({ x: first.left + first.width / 2, y: first.top - 64, text, pageNum, rects });
    });
  }, []);

  // ── Add highlight ──
  const handleHighlight = (color: string) => {
    if (!tooltip) return;
    setAnnotations(prev => [...prev, { id: `ann-${Date.now()}`, text: tooltip.text, note: '', color, pageNum: tooltip.pageNum, rects: tooltip.rects }]);
    setActiveColor(color);
    window.getSelection()?.removeAllRanges();
    setTooltip(null);
  };

  // ── Add note (opens drawer) ──
  const handleAddNote = () => {
    if (!tooltip) return;
    const ann: PdfAnnotation = { id: `ann-${Date.now()}`, text: tooltip.text, note: '', color: activeColor, pageNum: tooltip.pageNum, rects: tooltip.rects };
    setAnnotations(prev => [...prev, ann]);
    window.getSelection()?.removeAllRanges();
    setTooltip(null);
    setNoteTarget(ann);
    setNotesOpen(true);
  };

  const saveNote = (id: string, note: string) => {
    setAnnotations(prev => prev.map(a => a.id === id ? { ...a, note } : a));
    setNoteTarget(prev => prev?.id === id ? { ...prev, note } : prev);
  };

  const deleteAnnotation = (id: string) => {
    setAnnotations(prev => prev.filter(a => a.id !== id));
    if (noteTarget?.id === id) setNoteTarget(null);
  };

  const zoomOut = () => setScale(s => parseFloat(Math.max(0.5, s - 0.15).toFixed(2)));
  const zoomIn  = () => setScale(s => parseFloat(Math.min(3, s + 0.15).toFixed(2)));

  // ── TOC tree ──
  const TocNode = ({ item }: { item: TocItem }) => (
    <li>
      <button onClick={() => scrollToPage(item.pageNum)}
        className="w-full text-left py-1 rounded-lg text-xs font-sans hover:bg-[#f5f0e8] text-[#6b5744] hover:text-[#3d2f20] transition-colors flex items-baseline gap-1"
        style={{ paddingLeft: `${10 + item.level * 12}px`, paddingRight: 8 }}
      >
        <span className="flex-1 line-clamp-2 leading-snug">{item.title}</span>
        <span className="text-[#c0b0a0] text-[10px] flex-shrink-0">{item.pageNum}</span>
      </button>
      {item.children?.length ? <ul>{item.children.map((c, i) => <TocNode key={i} item={c} />)}</ul> : null}
    </li>
  );

  return (
    <div className="flex gap-3 items-start relative">

      {/* ═══ LEFT: TOC ══════════════════════════════════════════════ */}
      <AnimatePresence initial={false}>
        {tocOpen && toc.length > 0 && (
          <motion.div key="toc" initial={{ width: 0, opacity: 0 }} animate={{ width: 216, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 36 }} className="flex-shrink-0 overflow-hidden">
            <div className="w-[216px] sticky top-[62px] max-h-[calc(100vh-80px)] overflow-y-auto bg-white border border-[#e8e0d0] rounded-2xl shadow-sm">
              <div className="px-3 pt-3 pb-2 border-b border-[#f0ebe0] flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#3d2f20] uppercase tracking-wider font-sans">Mục lục</span>
                <button onClick={() => setTocOpen(false)} className="text-[#c0b0a0] hover:text-[#6b5744] text-xs">✕</button>
              </div>
              <ul className="py-2 px-1">{toc.map((item, i) => <TocNode key={i} item={item} />)}</ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ CENTER: PDF Pages ══════════════════════════════════════ */}
      <div className="flex-1 min-w-0">
        {/* Toolbar */}
        <div className="sticky top-[62px] z-10 flex items-center gap-2 bg-white/90 backdrop-blur border border-[#e8e0d0] rounded-2xl px-3 py-2 shadow-md mb-5">
          {toc.length > 0 && (
            <button onClick={() => setTocOpen(o => !o)} className="text-xs px-2.5 py-1.5 rounded-xl hover:bg-[#f5f0e8] text-[#6b5744] transition-colors font-sans">
              ☰ TOC
            </button>
          )}
          <span className="text-sm font-sans text-[#9c8870] flex-1 text-center">
            Trang <strong className="text-[#3d2f20]">{currentPage}</strong>{numPages ? ` / ${numPages}` : ''}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={zoomOut} className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-[#f5f0e8] text-[#6b5744]">−</button>
            <span className="text-xs text-[#9c8870] w-10 text-center">{Math.round(scale * 100)}%</span>
            <button onClick={zoomIn}  className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-[#f5f0e8] text-[#6b5744]">+</button>
          </div>
          <button
            onClick={() => setNotesOpen(o => !o)}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl transition-colors font-sans"
            style={{ backgroundColor: notesOpen ? '#fef08a' : '#f5f0e8', color: '#6b5744' }}
          >
            📝 Ghi chú
            {annotations.length > 0 && <span className="bg-[#3d2f20] text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">{annotations.length}</span>}
          </button>
        </div>

        {/* Pages */}
        <Document file={url} onLoadSuccess={onDocumentLoad}
          loading={<div className="flex items-center justify-center h-96 text-[#b0a090] font-sans text-sm">Đang tải PDF…</div>}
          error={<div className="text-center text-red-500 font-sans text-sm p-8 bg-red-50 rounded-2xl">Không thể tải PDF.</div>}
        >
          {Array.from({ length: numPages }, (_, i) => i + 1).map(pageNum => {
            const pageAnns = annotations.filter(a => a.pageNum === pageNum);
            return (
              <div
                key={pageNum}
                data-page={pageNum}
                ref={el => { if (el) pageRefs.current.set(pageNum, el); }}
                onMouseUp={() => handleMouseUp(pageNum)}
                className="relative mb-5 rounded-2xl overflow-hidden shadow-[0_2px_16px_rgba(60,40,20,0.08)] cursor-text"
              >
                <Page pageNumber={pageNum} scale={scale} />

                {/* Pixel-accurate highlight overlays */}
                {pageAnns.map(ann => {
                  const c = COLORS.find(x => x.key === ann.color) ?? COLORS[0];
                  return ann.rects.map((r, i) => (
                    <div
                      key={`${ann.id}-${i}`}
                      style={{
                        position: 'absolute',
                        left:   `${r.x}%`,
                        top:    `${r.y}%`,
                        width:  `${r.w}%`,
                        height: `${r.h}%`,
                        backgroundColor: c.bg,
                        pointerEvents: 'none',
                        mixBlendMode: 'multiply',
                        borderRadius: 2,
                      }}
                    />
                  ));
                })}

                {/* Margin note icons — appear on the right edge at each annotation's Y */}
                {pageAnns.map(ann => {
                  const c = COLORS.find(x => x.key === ann.color) ?? COLORS[0];
                  const topPct = ann.rects[0]?.y ?? 0;
                  return (
                    <button
                      key={`icon-${ann.id}`}
                      onClick={() => { setNoteTarget(ann); setNotesOpen(true); scrollToPage(pageNum); }}
                      title={ann.note || ann.text}
                      style={{
                        position: 'absolute',
                        right: -28,
                        top: `${topPct}%`,
                        backgroundColor: c.solid,
                        borderColor: c.border,
                        color: c.text,
                      }}
                      className="w-6 h-6 rounded-full border-2 text-[10px] flex items-center justify-center shadow-md hover:scale-125 transition-transform z-10"
                    >
                      {ann.note ? '💬' : '🖍'}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </Document>
      </div>

      {/* ═══ NOTES DRAWER ══════════════════════════════════════════ */}
      <AnimatePresence>
        {notesOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 bg-black/10"
              onClick={() => setNotesOpen(false)}
            />
            {/* Drawer */}
            <motion.div
              key="drawer"
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              className="fixed right-0 top-0 h-full w-80 z-40 bg-[#fdfbf7] border-l border-[#e8e0d0] shadow-2xl flex flex-col"
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#e8e0d0]">
                <h2 className="font-serif font-bold text-[#3d2f20] text-lg">📝 Ghi chú</h2>
                <button onClick={() => setNotesOpen(false)} className="text-[#9c8870] hover:text-[#3d2f20] text-xl w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[#f5f0e8] transition-colors">
                  ✕
                </button>
              </div>

              {/* Notes list */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {annotations.length === 0 ? (
                  <div className="text-center py-14 text-[#c0b0a0] font-sans text-sm">
                    <div className="text-3xl mb-3">✏️</div>
                    Chọn văn bản trên trang để tạo highlight & ghi chú
                  </div>
                ) : (
                  annotations.map(ann => {
                    const c = COLORS.find(x => x.key === ann.color) ?? COLORS[0];
                    const isActive = noteTarget?.id === ann.id;
                    return (
                      <motion.div
                        key={ann.id}
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className="rounded-2xl border p-3 font-sans text-sm"
                        style={{
                          backgroundColor: c.solid,
                          borderColor: isActive ? c.border : `${c.border}55`,
                          color: c.text,
                          boxShadow: isActive ? `0 0 0 2px ${c.border}` : 'none',
                        }}
                      >
                        {/* Quote → scroll to page */}
                        <button
                          onClick={() => { scrollToPage(ann.pageNum); setNoteTarget(ann); }}
                          className="w-full text-left font-medium text-xs mb-2 hover:underline leading-relaxed"
                        >
                          <span className="opacity-60 mr-1">trang {ann.pageNum} —</span>
                          "{ann.text}"
                        </button>

                        {/* Note textarea */}
                        <textarea
                          defaultValue={ann.note}
                          placeholder="Thêm ghi chú tại đây…"
                          rows={3}
                          onChange={e => saveNote(ann.id, e.target.value)}
                          className="w-full rounded-xl bg-white/60 border border-white/80 px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:bg-white/90 transition-all"
                          style={{ color: c.text }}
                        />

                        {/* Delete */}
                        <div className="flex justify-end mt-1.5">
                          <button
                            onClick={() => deleteAnnotation(ann.id)}
                            className="text-[10px] opacity-50 hover:opacity-100 hover:text-red-600 transition-colors"
                          >
                            Xóa
                          </button>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ═══ Tooltip ════════════════════════════════════════════════ */}
      <AnimatePresence>
        {tooltip && (
          <motion.div
            data-tooltip="true"
            style={{ position: 'fixed', top: Math.max(8, tooltip.y), left: tooltip.x, transform: 'translateX(-50%)', zIndex: 9999 }}
            initial={{ opacity: 0, y: 8, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 480, damping: 28 }}
            onMouseDown={e => e.preventDefault()}
            className="bg-white border border-[#e8e0d0] rounded-2xl px-3 py-2 flex items-center gap-2 shadow-xl select-none"
          >
            {COLORS.map(c => (
              <button key={c.key} onClick={() => handleHighlight(c.key)}
                className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-125 cursor-pointer"
                style={{ backgroundColor: c.solid, borderColor: activeColor === c.key ? '#3d2f20' : 'transparent' }}
              />
            ))}
            <div className="w-px h-5 bg-[#e8e0d0]" />
            <button onClick={handleAddNote}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#f5f0e8] hover:bg-[#fef08a] text-[#6b5744] text-xs font-medium transition-colors cursor-pointer"
            >
              ✏️ Ghi chú
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
