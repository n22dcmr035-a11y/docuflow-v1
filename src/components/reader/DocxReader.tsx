'use client';

import { useRef } from 'react';
import { useTextSelection } from '@/hooks/useTextSelection';
import { AnnotationTooltip } from './AnnotationTooltip';
import { HighlightLayer } from './HighlightLayer';
import { NotePanel } from './NotePanel';

interface DocxReaderProps {
  html: string;
  documentId: string;
}

export function DocxReader({ html, documentId }: DocxReaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  useTextSelection(containerRef);

  return (
    <div className="relative">
      {/* Floating annotation tooltip */}
      <AnnotationTooltip documentId={documentId} containerRef={containerRef} />

      {/* Highlight restoration layer */}
      <HighlightLayer containerRef={containerRef} />

      {/* Document content */}
      <div
        ref={containerRef}
        className="prose-reader"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {/* Note side panel */}
      <NotePanel documentId={documentId} />
    </div>
  );
}
