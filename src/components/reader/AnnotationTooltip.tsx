'use client';

import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReaderStore } from '@/store/readerStore';
import { useAnnotations } from '@/hooks/useAnnotations';
import { serializeRange } from '@/hooks/useTextSelection';
import { HIGHLIGHT_COLORS, type HighlightColor } from '@/types';

interface AnnotationTooltipProps {
  documentId: string;
  containerRef: React.RefObject<HTMLElement | null>;
}

const COLORS: HighlightColor[] = ['yellow', 'green', 'blue', 'pink'];

export function AnnotationTooltip({ documentId, containerRef }: AnnotationTooltipProps) {
  const selection = useReaderStore((s) => s.selection);
  const activeColor = useReaderStore((s) => s.activeColor);
  const setActiveColor = useReaderStore((s) => s.setActiveColor);
  const setSelection = useReaderStore((s) => s.setSelection);
  const setEditingAnnotation = useReaderStore((s) => s.setEditingAnnotation);
  const setNotePanelOpen = useReaderStore((s) => s.setNotePanelOpen);
  const { createAnnotation } = useAnnotations(documentId);
  const creating = useRef(false);

  if (!selection?.rect) return null;

  // Use fixed positioning relative to viewport
  const rect = selection.rect;
  const top = rect.top - 56; // 56px above the selection
  const centerX = rect.left + rect.width / 2;

  const handleHighlight = async (color: HighlightColor) => {
    if (creating.current || !selection.range || !containerRef.current) return;
    creating.current = true;
    try {
      setActiveColor(color);
      const position = serializeRange(selection.range, containerRef.current);
      await createAnnotation(selection.text, position, color);
      window.getSelection()?.removeAllRanges();
      setSelection(null);
    } finally {
      creating.current = false;
    }
  };

  const handleNote = async () => {
    if (!selection.range || !containerRef.current) return;
    const position = serializeRange(selection.range, containerRef.current);
    const ann = await createAnnotation(selection.text, position, activeColor);
    if (ann) {
      setEditingAnnotation(ann);
      setNotePanelOpen(true);
    }
    window.getSelection()?.removeAllRanges();
    setSelection(null);
  };

  return (
    <AnimatePresence>
      <motion.div
        key="tooltip"
        data-tooltip="true"
        style={{
          position: 'fixed',
          top: Math.max(8, top),
          left: centerX,
          transform: 'translateX(-50%)',
          zIndex: 9999,
        }}
        initial={{ opacity: 0, y: 8, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 480, damping: 28 }}
        className="float-shadow bg-white border border-[#e8e0d0] rounded-2xl px-3 py-2 flex items-center gap-2 select-none pointer-events-auto"
        // Prevent mousedown from bubbling to the document and collapsing selection
        onMouseDown={(e) => e.preventDefault()}
      >
        {/* Color swatches */}
        {COLORS.map((c) => (
          <button
            key={c}
            title={`Highlight ${HIGHLIGHT_COLORS[c].label}`}
            onClick={() => handleHighlight(c)}
            className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-125 cursor-pointer"
            style={{
              backgroundColor: HIGHLIGHT_COLORS[c].bg,
              borderColor: activeColor === c ? '#3d2f20' : 'transparent',
            }}
          />
        ))}

        {/* Divider */}
        <div className="w-px h-5 bg-[#e8e0d0] flex-shrink-0" />

        {/* Take Note */}
        <button
          title="Take Note"
          onClick={handleNote}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#f5f0e8] hover:bg-[#fef08a] text-[#6b5744] text-xs font-sans font-medium transition-colors cursor-pointer whitespace-nowrap"
        >
          <span>✏️</span> Note
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
