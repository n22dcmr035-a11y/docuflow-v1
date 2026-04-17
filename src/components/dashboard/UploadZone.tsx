'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';

interface UploadZoneProps {
  onUpload: (file: File) => Promise<void>;
}

const ACCEPTED = '.pdf,.docx';
const MAX_MB = 10;

export function UploadZone({ onUpload }: UploadZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validate = (file: File): string | null => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'docx'].includes(ext ?? '')) return 'Only PDF and DOCX files are supported.';
    if (file.size > MAX_MB * 1024 * 1024) return `File must be under ${MAX_MB} MB.`;
    return null;
  };

  const handleFile = useCallback(
    async (file: File) => {
      const err = validate(file);
      if (err) { setError(err); return; }
      setError(null);
      setUploading(true);
      try {
        await onUpload(file);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Upload failed.');
      } finally {
        setUploading(false);
      }
    },
    [onUpload]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  return (
    <motion.div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      onClick={() => !uploading && inputRef.current?.click()}
      animate={{ borderColor: dragOver ? '#8abfcf' : '#e8e0d0', scale: dragOver ? 1.01 : 1 }}
      transition={{ duration: 0.15 }}
      className="relative border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer select-none transition-colors"
      style={{ backgroundColor: dragOver ? '#b5d5e033' : '#fdfbf7' }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        onChange={onInputChange}
        className="hidden"
        id="file-upload"
      />

      <AnimatePresence mode="wait">
        {uploading ? (
          <motion.div
            key="uploading"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-col items-center gap-3"
          >
            <svg className="animate-spin h-10 w-10 text-[#b5d5e0]" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <p className="text-[#6b5744] font-sans text-sm">Uploading & parsing document…</p>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="text-5xl">📂</div>
            <div>
              <p className="text-[#3d2f20] font-sans font-semibold text-base">
                Drop your document here
              </p>
              <p className="text-[#9c8870] font-sans text-sm mt-1">
                or click to browse — PDF & DOCX up to {MAX_MB} MB
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>
              Choose File
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 text-sm text-[#831843] bg-[#fbcfe8] rounded-xl px-4 py-2 font-sans"
        >
          {error}
        </motion.p>
      )}
    </motion.div>
  );
}
