'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReaderStore } from '@/store/readerStore';
import { useAnnotations } from '@/hooks/useAnnotations';
import { Button } from '@/components/ui/Button';
import { HIGHLIGHT_COLORS } from '@/types';
import { formatDate } from '@/lib/utils';

interface NotePanelProps {
  documentId: string;
}

export function NotePanel({ documentId }: NotePanelProps) {
  const open = useReaderStore((s) => s.notePanelOpen);
  const setOpen = useReaderStore((s) => s.setNotePanelOpen);
  const annotation = useReaderStore((s) => s.editingAnnotation);
  const annotations = useReaderStore((s) => s.annotations);
  const setEditingAnnotation = useReaderStore((s) => s.setEditingAnnotation);

  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);
  const { saveNote, deleteAnnotation } = useAnnotations(documentId);

  const handleOpen = (ann: typeof annotation) => {
    setEditingAnnotation(ann);
    setNoteText(ann?.note_content ?? '');
    setOpen(true);
  };

  const handleSave = async () => {
    if (!annotation) return;
    setSaving(true);
    await saveNote(annotation.id, noteText);
    setSaving(false);
    setOpen(false);
  };

  const handleDelete = async () => {
    if (!annotation) return;
    await deleteAnnotation(annotation.id);
    setOpen(false);
    setEditingAnnotation(null);
  };

  return (
    <>
      {/* Side panel */}
      <AnimatePresence>
        {open && annotation && (
          <motion.aside
            key="note-panel"
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed right-0 top-0 h-full w-80 bg-[#fdfbf7] border-l border-[#e8e0d0] z-40 flex flex-col shadow-[−8px_0_32px_rgba(60,40,20,0.08)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#e8e0d0]">
              <h3 className="font-sans font-semibold text-[#3d2f20] text-base">📝 My Note</h3>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#f5f0e8] text-[#9c8870] text-sm transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Highlighted quote */}
            <div className="px-5 py-4 border-b border-[#e8e0d0]">
              <div
                className="rounded-xl px-4 py-3 text-sm font-serif italic text-[#3d2f20] leading-relaxed"
                style={{ backgroundColor: HIGHLIGHT_COLORS[annotation.color].bg }}
              >
                "{annotation.highlighted_text}"
              </div>
              <p className="text-[11px] text-[#b0a090] font-sans mt-2">
                Added {formatDate(annotation.created_at)}
              </p>
            </div>

            {/* Note textarea */}
            <div className="flex-1 px-5 py-4 overflow-y-auto">
              <label className="block text-xs font-sans font-semibold text-[#9c8870] uppercase tracking-wide mb-2">
                Your thoughts
              </label>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Write your note here…"
                className="w-full h-40 resize-none rounded-2xl border border-[#e8e0d0] bg-white px-4 py-3 text-sm font-sans text-[#3d2f20] placeholder-[#b0a090] focus:outline-none focus:border-[#b5d5e0] transition-colors"
              />
            </div>

            {/* Actions */}
            <div className="px-5 py-4 border-t border-[#e8e0d0] flex gap-2">
              <Button variant="primary" size="sm" loading={saving} onClick={handleSave} className="flex-1">
                Save Note
              </Button>
              <Button variant="danger" size="sm" onClick={handleDelete}>
                🗑️
              </Button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* All annotations list (collapsed view) */}
      {!open && annotations.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed right-4 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-2"
        >
          {annotations.slice(0, 6).map((ann) => (
            <button
              key={ann.id}
              onClick={() => handleOpen(ann)}
              title={ann.highlighted_text.slice(0, 50)}
              className="w-3 h-3 rounded-full border border-white shadow-md transition-transform hover:scale-150"
              style={{ backgroundColor: HIGHLIGHT_COLORS[ann.color].bg }}
            />
          ))}
          {annotations.length > 6 && (
            <span className="text-[9px] text-[#b0a090] font-sans text-center">
              +{annotations.length - 6}
            </span>
          )}
        </motion.div>
      )}
    </>
  );
}
