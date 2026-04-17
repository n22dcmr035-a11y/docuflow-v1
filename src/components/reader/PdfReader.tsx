'use client';

import dynamic from 'next/dynamic';

const PdfReaderClient = dynamic(
  () => import('./PdfReaderClient').then((m) => m.PdfReaderClient),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-96 text-[#b0a090] font-sans text-sm">
        Loading PDF viewer…
      </div>
    ),
  }
);

interface PdfReaderProps {
  url: string;
  documentId: string;
}

export function PdfReader({ url, documentId }: PdfReaderProps) {
  return <PdfReaderClient url={url} documentId={documentId} />;
}
