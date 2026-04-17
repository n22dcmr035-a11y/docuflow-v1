'use client';

import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/Button';

// react-pdf uses DOMMatrix and canvas APIs that don't exist in Node.js/SSR
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
}

export function PdfReader({ url }: PdfReaderProps) {
  return <PdfReaderClient url={url} />;
}
