'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import type { Document } from '@/types';
import { formatDate, readingTime } from '@/lib/utils';

interface CurrentlyReadingProps {
  document: Document;
}

export function CurrentlyReading({ document: doc }: CurrentlyReadingProps) {
  const router = useRouter();
  const pct = doc.scroll_pct ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-3xl border border-[#e8e0d0] bg-white card-shadow"
      style={{ background: `linear-gradient(135deg, ${doc.cover_color}33 0%, #fdfbf7 60%)` }}
    >
      {/* decorative blob */}
      <div
        className="absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-30 blur-2xl pointer-events-none"
        style={{ backgroundColor: doc.cover_color }}
      />

      <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start md:items-center">
        {/* Spine visual */}
        <div
          className="w-16 h-24 md:w-20 md:h-28 rounded-xl flex-shrink-0 flex items-center justify-center shadow-md"
          style={{ backgroundColor: doc.cover_color }}
        >
          <span className="text-2xl">
            {doc.file_type === 'pdf' ? '📕' : '📗'}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#9c8870] mb-1 font-sans">
            Currently Reading
          </p>
          <h2 className="text-2xl font-bold text-[#3d2f20] font-serif truncate mb-1">
            {doc.title}
          </h2>
          <p className="text-sm text-[#9c8870] font-sans mb-4">
            {doc.word_count > 0 && `${readingTime(doc.word_count)} min read · `}
            {doc.last_read ? `Last read ${formatDate(doc.last_read)}` : 'Not started yet'}
          </p>

          <div className="mb-4">
            <ProgressBar value={pct} color={doc.cover_color} height={8} showLabel animated />
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={() => router.push(`/read/${doc.id}`)}
            icon={<span>📖</span>}
          >
            {pct > 0 ? 'Continue Reading' : 'Start Reading'}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
