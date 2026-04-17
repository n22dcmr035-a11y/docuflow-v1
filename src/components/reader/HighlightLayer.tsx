'use client';

import { useEffect, useRef } from 'react';
import { useReaderStore } from '@/store/readerStore';
import { HIGHLIGHT_COLORS } from '@/types';
import { deserializeRange } from '@/hooks/useTextSelection';

interface HighlightLayerProps {
  containerRef: React.RefObject<HTMLElement | null>;
}

export function HighlightLayer({ containerRef }: HighlightLayerProps) {
  const annotations = useReaderStore((s) => s.annotations);
  const setEditingAnnotation = useReaderStore((s) => s.setEditingAnnotation);
  const setNotePanelOpen = useReaderStore((s) => s.setNotePanelOpen);
  const applied = useRef<Set<string>>(new Set());

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    annotations.forEach((ann) => {
      if (applied.current.has(ann.id)) return;

      const range = deserializeRange(ann.position, container);
      if (!range) return;

      try {
        const colorDef = HIGHLIGHT_COLORS[ann.color];
        const mark = document.createElement('mark');
        mark.className = `highlight-${ann.color}`;
        mark.dataset.annotationId = ann.id;
        mark.title = ann.note_content ?? ann.highlighted_text.slice(0, 60);
        mark.style.backgroundColor = colorDef.bg;
        mark.style.cursor = 'pointer';
        mark.style.borderRadius = '3px';
        mark.style.padding = '0 2px';

        mark.addEventListener('click', (e) => {
          e.stopPropagation();
          setEditingAnnotation(ann);
          setNotePanelOpen(true);
        });

        range.surroundContents(mark);
        applied.current.add(ann.id);
      } catch {
        // Range spans multiple nodes — skip for now
      }
    });
  }, [annotations, containerRef, setEditingAnnotation, setNotePanelOpen]);

  return null; // purely imperative DOM manipulation
}
