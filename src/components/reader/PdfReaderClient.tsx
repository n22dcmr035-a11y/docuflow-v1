'use client';

import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfReaderClientProps {
  url: string;
}

export function PdfReaderClient({ url }: PdfReaderClientProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1.2);

  const zoomOut = () => setScale((s) => parseFloat(Math.max(0.5, s - 0.1).toFixed(1)));
  const zoomIn = () => setScale((s) => parseFloat(Math.min(3, s + 0.1).toFixed(1)));
  const prevPage = () => setPage((p) => Math.max(1, p - 1));
  const nextPage = () => setPage((p) => Math.min(numPages, p + 1));

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Controls */}
      <div className="sticky top-16 z-10 flex items-center gap-3 bg-white/80 backdrop-blur border border-[#e8e0d0] rounded-2xl px-4 py-2 shadow-md">
        <button
          onClick={prevPage}
          disabled={page <= 1}
          className="px-3 py-1 rounded-xl text-sm font-sans text-[#6b5744] hover:bg-[#f5f0e8] disabled:opacity-40 transition-colors"
        >
          ← Prev
        </button>
        <span className="text-sm font-sans text-[#6b5744] min-w-[70px] text-center">
          {page} / {numPages || '…'}
        </span>
        <button
          onClick={nextPage}
          disabled={page >= numPages}
          className="px-3 py-1 rounded-xl text-sm font-sans text-[#6b5744] hover:bg-[#f5f0e8] disabled:opacity-40 transition-colors"
        >
          Next →
        </button>
        <div className="w-px h-5 bg-[#e8e0d0]" />
        <button onClick={zoomOut} className="px-2 py-1 rounded-xl text-sm font-sans text-[#6b5744] hover:bg-[#f5f0e8] transition-colors">−</button>
        <span className="text-xs text-[#9c8870] w-10 text-center">{Math.round(scale * 100)}%</span>
        <button onClick={zoomIn} className="px-2 py-1 rounded-xl text-sm font-sans text-[#6b5744] hover:bg-[#f5f0e8] transition-colors">+</button>
      </div>

      {/* PDF Render */}
      <Document
        file={url}
        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        loading={
          <div className="flex items-center justify-center h-96 text-[#b0a090] font-sans text-sm">
            Loading PDF…
          </div>
        }
        error={
          <div className="text-center text-[#831843] font-sans text-sm p-8 bg-[#fbcfe8] rounded-2xl">
            Failed to load PDF. Please try again.
          </div>
        }
      >
        <Page
          pageNumber={page}
          scale={scale}
          className="rounded-2xl overflow-hidden shadow-[0_4px_24px_rgba(60,40,20,0.1)]"
        />
      </Document>
    </div>
  );
}
