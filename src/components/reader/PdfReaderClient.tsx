'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

/* ─── Constants ─────────────────────────────────────────────────── */

const COLORS = [
  { key: 'yellow', bg: 'rgba(253,224,71,0.45)',  solid: '#fef08a', border: '#ca8a04', text: '#78350f' },
  { key: 'green',  bg: 'rgba(74,222,128,0.35)',  solid: '#bbf7d0', border: '#16a34a', text: '#14532d' },
  { key: 'blue',   bg: 'rgba(96,165,250,0.35)',  solid: '#bfdbfe', border: '#2563eb', text: '#1e3a8a' },
  { key: 'pink',   bg: 'rgba(244,114,182,0.35)', solid: '#fbcfe8', border: '#db2777', text: '#831843' },
];

/* ─── Types ─────────────────────────────────────────────────────── */

interface HRect { x: number; y: number; w: number; h: number; }

interface PdfAnnotation {
  id: string;
  text: string;
  note: string;
  color: string;
  pageNum: number;
  rects: HRect[];
}

interface TocItem { title: string; pageNum: number; level: number; children?: TocItem[]; }

interface PdfReaderClientProps { url: string; documentId: string; }

/* ─── Storage helpers ───────────────────────────────────────────── */

const annKey  = (id: string) => `docuflow-pdf-ann-${id}`;
const pageKey = (id: string) => `docuflow-pdf-page-${id}`;

function localLoadAnnotations(docId: string): PdfAnnotation[] {
  if (typeof window === 'undefined') return [];
  try { const s = localStorage.getItem(annKey(docId)); return s ? JSON.parse(s) : []; } catch { return []; }
}

function localSaveAnnotations(docId: string, anns: PdfAnnotation[]) {
  try { localStorage.setItem(annKey(docId), JSON.stringify(anns)); } catch { /* */ }
}

function localLoadPage(docId: string): number {
  if (typeof window === 'undefined') return 1;
  try { return parseInt(localStorage.getItem(pageKey(docId)) || '1') || 1; } catch { return 1; }
}

function localSavePage(docId: string, page: number) {
  try { localStorage.setItem(pageKey(docId), String(page)); } catch { /* */ }
}

/* ─── TOC resolver ──────────────────────────────────────────────── */

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
    } catch { /* */ }
    const children = item.items && (item.items as typeof outline).length > 0
      ? await resolveOutline(item.items as typeof outline, pdf, level + 1) : [];
    out.push({ title: item.title, pageNum, level, children });
  }
  return out;
}

/* ─── Supabase sync ─────────────────────────────────────────────── */

async function supabaseLoadAnnotations(docId: string): Promise<PdfAnnotation[] | null> {
  try {
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;
    const { data, error } = await sb
      .from('annotations')
      .select('id, highlighted_text, position, color, note_content')
      .eq('document_id', docId)
      .eq('user_id', user.id);
    if (error || !data) return null;
    return data.map(r => ({
      id: r.id,
      text: r.highlighted_text,
      note: r.note_content ?? '',
      color: r.color ?? 'yellow',
      pageNum: (r.position as { pageNum: number })?.pageNum ?? 1,
      rects: (r.position as { rects: HRect[] })?.rects ?? [],
    }));
  } catch { return null; }
}

async function supabaseSaveAnnotation(docId: string, ann: PdfAnnotation): Promise<string | null> {
  try {
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;
    const { data, error } = await sb.from('annotations').insert({
      id: ann.id.startsWith('ann-') ? undefined : ann.id, // let DB generate UUID for local IDs
      user_id: user.id,
      document_id: docId,
      highlighted_text: ann.text,
      position: { pageNum: ann.pageNum, rects: ann.rects },
      color: ann.color,
      note_content: ann.note || null,
    }).select('id').single();
    if (error || !data) return null;
    return data.id;
  } catch { return null; }
}

async function supabaseUpdateNote(annId: string, note: string) {
  try {
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    await sb.from('annotations').update({ note_content: note || null, updated_at: new Date().toISOString() }).eq('id', annId);
  } catch { /* */ }
}

async function supabaseDeleteAnnotation(annId: string) {
  try {
    const sb = createClient();
    await sb.from('annotations').delete().eq('id', annId);
  } catch { /* */ }
}

async function supabaseLoadPage(docId: string): Promise<number | null> {
  try {
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;
    const { data } = await sb.from('reading_progress').select('current_page').eq('document_id', docId).eq('user_id', user.id).single();
    return data?.current_page ?? null;
  } catch { return null; }
}

async function supabaseSavePage(docId: string, page: number) {
  try {
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    await sb.from('reading_progress').upsert({
      user_id: user.id,
      document_id: docId,
      current_page: page,
      last_read: new Date().toISOString(),
    }, { onConflict: 'user_id,document_id' });
  } catch { /* */ }
}

/* ─── Component ─────────────────────────────────────────────────── */

export function PdfReaderClient({ url, documentId }: PdfReaderClientProps) {
  // Initialize annotations from localStorage synchronously — no race condition
  const [annotations, setAnnotations] = useState<PdfAnnotation[]>(() => localLoadAnnotations(documentId));
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [currentPage, setCurrentPage] = useState(1);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [tocOpen, setTocOpen] = useState(true);
  const [pageNavOpen, setPageNavOpen] = useState(true);
  const [notesOpen, setNotesOpen] = useState(false);
  const [activeColor, setActiveColor] = useState('yellow');
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string; pageNum: number; rects: HRect[] } | null>(null);
  const [noteTarget, setNoteTarget] = useState<PdfAnnotation | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'local'>('idle');

  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const pageGridRef = useRef<HTMLDivElement>(null);
  // Read saved page synchronously so it's available before onDocumentLoad fires
  const savedPage = useRef<number>(localLoadPage(documentId));
  const pageSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── On mount: try to load from Supabase (overrides localStorage if found) ──
  useEffect(() => {
    setSyncStatus('syncing');
    Promise.all([
      supabaseLoadAnnotations(documentId),
      supabaseLoadPage(documentId),
    ]).then(([sbAnns, sbPage]) => {
      if (sbAnns !== null) {
        setAnnotations(sbAnns);
        localSaveAnnotations(documentId, sbAnns); // keep local in sync
        setSyncStatus('synced');
      } else {
        setSyncStatus('local');
      }
      if (sbPage !== null) {
        savedPage.current = sbPage;
      }
    }).catch(() => setSyncStatus('local'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  // ── Save annotations to localStorage whenever they change ──
  useEffect(() => {
    localSaveAnnotations(documentId, annotations);
  }, [annotations, documentId]);

  // ── Save current page (debounced 2s) ──
  useEffect(() => {
    if (currentPage < 1) return;
    localSavePage(documentId, currentPage);
    // Debounce Supabase write to avoid hammering on every scroll
    if (pageSaveTimer.current) clearTimeout(pageSaveTimer.current);
    pageSaveTimer.current = setTimeout(() => {
      supabaseSavePage(documentId, currentPage);
    }, 2000);
  }, [currentPage, documentId]);

  // ── Auto-scroll page grid to active page button ──
  useEffect(() => {
    if (!pageGridRef.current) return;
    const btn = pageGridRef.current.querySelector(`[data-pgbtn="${currentPage}"]`);
    btn?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [currentPage]);

  // ── Scroll to page ──
  const scrollToPage = useCallback((p: number) => {
    pageRefs.current.get(p)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // ── IntersectionObserver ──
  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) setCurrentPage(parseInt(e.target.getAttribute('data-page') || '1')); }),
      { rootMargin: '-35% 0px -35% 0px' }
    );
    const refs = pageRefs.current;
    refs.forEach(el => obs.observe(el));
    return () => refs.forEach(el => obs.unobserve(el));
  }, [numPages]);

  // ── PDF load: extract TOC + restore page ──
  const onDocumentLoad = useCallback(async (proxy: { numPages: number }) => {
    const n = proxy.numPages;
    setNumPages(n);
    try {
      const pdf = proxy as unknown as PDFDocumentProxy;
      const raw = await pdf.getOutline();
      if (raw?.length) setToc(await resolveOutline(raw as { title: string; dest: unknown; items?: unknown[] }[], pdf));
    } catch { setToc([]); }
    // Scroll to last-read page (wait for pages to mount)
    const target = Math.min(savedPage.current, n);
    if (target > 1) {
      setTimeout(() => {
        pageRefs.current.get(target)?.scrollIntoView({ behavior: 'auto', block: 'start' });
      }, 600);
    }
  }, []);

  // ── Text selection → tooltip ──
  const handleMouseUp = useCallback((pageNum: number) => {
    requestAnimationFrame(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) { setTooltip(null); return; }
      const text = sel.toString().trim();
      if (!text) { setTooltip(null); return; }
      const pageEl = pageRefs.current.get(pageNum);
      if (!pageEl) { setTooltip(null); return; }
      const pageRect = pageEl.getBoundingClientRect();
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
      const first = clientRects[0];
      setTooltip({ x: first.left + first.width / 2, y: first.top - 64, text, pageNum, rects });
    });
  }, []);

  // ── Add highlight ──
  const handleHighlight = async (color: string) => {
    if (!tooltip) return;
    const newAnn: PdfAnnotation = {
      id: `ann-${Date.now()}`,
      text: tooltip.text,
      note: '',
      color,
      pageNum: tooltip.pageNum,
      rects: tooltip.rects,
    };
    setActiveColor(color);
    window.getSelection()?.removeAllRanges();
    setTooltip(null);
    // Save to Supabase to get real UUID
    const realId = await supabaseSaveAnnotation(documentId, newAnn);
    if (realId) { newAnn.id = realId; setSyncStatus('synced'); }
    else setSyncStatus('local');
    setAnnotations(prev => [...prev, newAnn]);
  };

  // ── Add note ──
  const handleAddNote = async () => {
    if (!tooltip) return;
    const newAnn: PdfAnnotation = {
      id: `ann-${Date.now()}`,
      text: tooltip.text,
      note: '',
      color: activeColor,
      pageNum: tooltip.pageNum,
      rects: tooltip.rects,
    };
    window.getSelection()?.removeAllRanges();
    setTooltip(null);
    const realId = await supabaseSaveAnnotation(documentId, newAnn);
    if (realId) { newAnn.id = realId; setSyncStatus('synced'); }
    else setSyncStatus('local');
    setAnnotations(prev => [...prev, newAnn]);
    setNoteTarget(newAnn);
    setNotesOpen(true);
  };

  const saveNote = (id: string, note: string) => {
    setAnnotations(prev => prev.map(a => a.id === id ? { ...a, note } : a));
    setNoteTarget(prev => prev?.id === id ? { ...prev, note } : prev);
    supabaseUpdateNote(id, note);
  };

  const deleteAnnotation = (id: string) => {
    setAnnotations(prev => prev.filter(a => a.id !== id));
    if (noteTarget?.id === id) setNoteTarget(null);
    supabaseDeleteAnnotation(id);
  };

  const zoomOut = () => setScale(s => parseFloat(Math.max(0.5, s - 0.15).toFixed(2)));
  const zoomIn  = () => setScale(s => parseFloat(Math.min(3, s + 0.15).toFixed(2)));

  // ── TOC tree ──
  const TocNode = ({ item }: { item: TocItem }) => (
    <li>
      <button
        onClick={() => scrollToPage(item.pageNum)}
        className="w-full text-left py-1 rounded-lg text-xs font-sans hover:bg-[#f5f0e8] text-[#6b5744] hover:text-[#3d2f20] transition-colors flex items-baseline gap-1"
        style={{ paddingLeft: `${10 + item.level * 12}px`, paddingRight: 8 }}
      >
        <span className="flex-1 line-clamp-2 leading-snug">{item.title}</span>
        <span className="text-[#c0b0a0] text-[10px] flex-shrink-0">{item.pageNum}</span>
      </button>
      {item.children?.length ? <ul>{item.children.map((c, i) => <TocNode key={i} item={c} />)}</ul> : null}
    </li>
  );

  const syncIcon = syncStatus === 'synced' ? '☁️' : syncStatus === 'syncing' ? '⏳' : syncStatus === 'local' ? '💾' : '';

  return (
    <div className="flex gap-3 items-start">

      {/* Unified left sidebar: TOC outline + page grid */}
      <AnimatePresence initial={false}>
        {tocOpen && (
          <motion.div
            key="leftnav"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 200, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 36 }}
            className="flex-shrink-0 overflow-hidden"
          >
            <div className="w-[200px] sticky top-[62px] max-h-[calc(100vh-80px)] overflow-y-auto bg-white border border-[#e8e0d0] rounded-2xl shadow-sm flex flex-col">
              {/* Header */}
              <div className="px-3 pt-3 pb-2 border-b border-[#f0ebe0] flex items-center justify-between flex-shrink-0">
                <span className="text-[11px] font-semibold text-[#3d2f20] uppercase tracking-wider font-sans">Điều hướng</span>
                <button onClick={() => setTocOpen(false)} className="text-[#c0b0a0] hover:text-[#6b5744] text-xs">✕</button>
              </div>

              {/* TOC outline (only if PDF has bookmarks) */}
              {toc.length > 0 && (
                <div className="border-b border-[#f0ebe0]">
                  <p className="text-[10px] uppercase tracking-wider text-[#b0a090] px-3 pt-2 pb-1 font-sans">Mục lục</p>
                  <ul className="pb-2 px-1">{toc.map((item, i) => <TocNode key={i} item={item} />)}</ul>
                </div>
              )}

              {/* Page grid — auto-scrolls to current page */}
              <div className="flex-1 overflow-y-auto p-2" ref={pageGridRef}>
                <p className="text-[10px] uppercase tracking-wider text-[#b0a090] px-1 mb-2 font-sans">Tất cả trang</p>
                <div className="grid grid-cols-4 gap-1">
                  {numPages > 0
                    ? Array.from({ length: numPages }, (_, i) => i + 1).map(p => (
                      <button
                        key={p}
                        data-pgbtn={p}
                        onClick={() => scrollToPage(p)}
                        className="aspect-square flex items-center justify-center rounded-lg text-[10px] font-sans font-medium transition-all duration-200"
                        style={{
                          backgroundColor: p === currentPage ? '#3d2f20' : '#f5f0e8',
                          color: p === currentPage ? 'white' : '#6b5744',
                          transform: p === currentPage ? 'scale(1.15)' : 'scale(1)',
                          boxShadow: p === currentPage ? '0 2px 8px rgba(61,47,32,0.3)' : 'none',
                        }}
                      >
                        {p}
                      </button>
                    ))
                    : <p className="col-span-4 text-[10px] text-[#c0b0a0] text-center py-4">Đang tải…</p>
                  }
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PDF Pages */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Toolbar */}
        <div className="sticky top-[62px] z-10 flex items-center gap-2 bg-white/90 backdrop-blur border border-[#e8e0d0] rounded-2xl px-3 py-2 shadow-md mb-5">
          <button onClick={() => setTocOpen(o => !o)}
            className="text-xs px-2.5 py-1.5 rounded-xl transition-colors font-sans"
            style={{ backgroundColor: tocOpen ? '#bfdbfe' : '#f5f0e8', color: '#1e3a8a' }}
          >
            ☰ Điều hướng
          </button>
          <span className="text-sm font-sans text-[#9c8870] flex-1 text-center">
            Trang <strong className="text-[#3d2f20]">{currentPage}</strong>{numPages ? ` / ${numPages}` : ''}
          </span>
          {syncIcon && <span title={syncStatus} className="text-sm">{syncIcon}</span>}
          <div className="flex items-center gap-1">
            <button onClick={zoomOut} className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-[#f5f0e8] text-[#6b5744]">−</button>
            <span className="text-xs text-[#9c8870] w-10 text-center">{Math.round(scale * 100)}%</span>
            <button onClick={zoomIn}  className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-[#f5f0e8] text-[#6b5744]">+</button>
          </div>
          <button onClick={() => setNotesOpen(o => !o)}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl transition-colors font-sans"
            style={{ backgroundColor: notesOpen ? '#fef08a' : '#f5f0e8', color: '#6b5744' }}
          >
            📝 Ghi chú
            {annotations.length > 0 && <span className="bg-[#3d2f20] text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">{annotations.length}</span>}
          </button>
          <button onClick={() => setPageNavOpen(o => !o)}
            className="text-xs px-2.5 py-1.5 rounded-xl transition-colors font-sans"
            style={{ backgroundColor: pageNavOpen ? '#bfdbfe' : '#f5f0e8', color: '#1e3a8a' }}
          >
            ☰ Trang
          </button>
        </div>

        {/* Pages */}
        <div className="flex flex-col items-center">
          <Document file={url} onLoadSuccess={onDocumentLoad}
            loading={<div className="flex items-center justify-center h-96 text-[#b0a090] font-sans text-sm">Đang tải PDF…</div>}
            error={<div className="text-center text-red-500 font-sans text-sm p-8 bg-red-50 rounded-2xl">Không thể tải PDF.</div>}
          >
            {Array.from({ length: numPages }, (_, i) => i + 1).map(pageNum => {
              const pageAnns = annotations.filter(a => a.pageNum === pageNum);
              return (
                <div key={pageNum} data-page={pageNum}
                  ref={el => { if (el) pageRefs.current.set(pageNum, el); }}
                  onMouseUp={() => handleMouseUp(pageNum)}
                  className="relative mb-5 cursor-text"
                  style={{ width: 'fit-content' }}
                >
                  <div className="rounded-2xl overflow-hidden shadow-[0_2px_16px_rgba(60,40,20,0.08)]">
                    <Page pageNumber={pageNum} scale={scale} />
                    {pageAnns.map(ann => {
                      const c = COLORS.find(x => x.key === ann.color) ?? COLORS[0];
                      return ann.rects.map((r, i) => (
                        <div key={`${ann.id}-${i}`} style={{
                          position: 'absolute', left: `${r.x}%`, top: `${r.y}%`,
                          width: `${r.w}%`, height: `${r.h}%`,
                          backgroundColor: c.bg, pointerEvents: 'none',
                          mixBlendMode: 'multiply', borderRadius: 2,
                        }} />
                      ));
                    })}
                  </div>
                  {pageAnns.map(ann => {
                    const c = COLORS.find(x => x.key === ann.color) ?? COLORS[0];
                    return (
                      <button key={`icon-${ann.id}`}
                        onClick={() => { setNoteTarget(ann); setNotesOpen(true); }}
                        title={ann.note || ann.text}
                        style={{ position: 'absolute', right: -30, top: `${ann.rects[0]?.y ?? 0}%`,
                          backgroundColor: c.solid, borderColor: c.border, color: c.text, zIndex: 5 }}
                        className="w-6 h-6 rounded-full border-2 text-[10px] flex items-center justify-center shadow-md hover:scale-125 transition-transform"
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
      </div>


      {/* Notes Drawer */}
      <AnimatePresence>
        {notesOpen && (
          <>
            <motion.div key="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 bg-black/10" onClick={() => setNotesOpen(false)} />
            <motion.div key="drawer" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              className="fixed right-0 top-0 h-full w-80 z-40 bg-[#fdfbf7] border-l border-[#e8e0d0] shadow-2xl flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#e8e0d0]">
                <h2 className="font-serif font-bold text-[#3d2f20] text-lg">📝 Ghi chú</h2>
                <span className="text-xs text-[#b0a090] mr-auto ml-3">{syncIcon} {syncStatus === 'synced' ? 'Đã đồng bộ' : syncStatus === 'local' ? 'Lưu cục bộ' : ''}</span>
                <button onClick={() => setNotesOpen(false)} className="text-[#9c8870] hover:text-[#3d2f20] w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[#f5f0e8] transition-colors">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {annotations.length === 0 ? (
                  <div className="text-center py-14 text-[#c0b0a0] font-sans text-sm">
                    <div className="text-3xl mb-3">✏️</div>
                    Chọn văn bản để tạo highlight &amp; ghi chú
                  </div>
                ) : (
                  annotations.map(ann => {
                    const c = COLORS.find(x => x.key === ann.color) ?? COLORS[0];
                    const isActive = noteTarget?.id === ann.id;
                    return (
                      <motion.div key={ann.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className="rounded-2xl border p-3 font-sans text-sm"
                        style={{ backgroundColor: c.solid, borderColor: isActive ? c.border : `${c.border}55`,
                          color: c.text, boxShadow: isActive ? `0 0 0 2px ${c.border}` : 'none' }}>
                        <button onClick={() => { scrollToPage(ann.pageNum); setNoteTarget(ann); }}
                          className="w-full text-left font-medium text-xs mb-2 hover:underline leading-relaxed">
                          <span className="opacity-60 mr-1">trang {ann.pageNum} —</span>
                          &ldquo;{ann.text}&rdquo;
                        </button>
                        <textarea
                          defaultValue={ann.note}
                          placeholder="Thêm ghi chú tại đây…"
                          rows={3}
                          onChange={e => saveNote(ann.id, e.target.value)}
                          className="w-full rounded-xl bg-white/60 border border-white/80 px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:bg-white/90 transition-all"
                          style={{ color: c.text }}
                        />
                        <div className="flex justify-end mt-1.5">
                          <button onClick={() => deleteAnnotation(ann.id)}
                            className="text-[10px] opacity-50 hover:opacity-100 hover:text-red-600 transition-colors">Xóa</button>
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

      {/* Floating tooltip */}
      <AnimatePresence>
        {tooltip && (
          <motion.div data-tooltip="true"
            style={{ position: 'fixed', top: Math.max(8, tooltip.y), left: tooltip.x, transform: 'translateX(-50%)', zIndex: 9999 }}
            initial={{ opacity: 0, y: 8, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 480, damping: 28 }}
            onMouseDown={e => e.preventDefault()}
            className="bg-white border border-[#e8e0d0] rounded-2xl px-3 py-2 flex items-center gap-2 shadow-xl select-none">
            {COLORS.map(c => (
              <button key={c.key} onClick={() => handleHighlight(c.key)}
                className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-125 cursor-pointer"
                style={{ backgroundColor: c.solid, borderColor: activeColor === c.key ? '#3d2f20' : 'transparent' }} />
            ))}
            <div className="w-px h-5 bg-[#e8e0d0]" />
            <button onClick={handleAddNote}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#f5f0e8] hover:bg-[#fef08a] text-[#6b5744] text-xs font-medium transition-colors cursor-pointer">
              ✏️ Ghi chú
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
