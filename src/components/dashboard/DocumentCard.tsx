'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ProgressBar } from '@/components/ui/ProgressBar';
import type { Document } from '@/types';
import { formatDate, readingTime } from '@/lib/utils';

interface DocumentCardProps {
  document: Document;
  index?: number;
}

export function DocumentCard({ document: doc, index = 0 }: DocumentCardProps) {
  const router = useRouter();
  const pct = doc.scroll_pct ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.07, ease: 'easeOut' }}
      onClick={() => router.push(`/read/${doc.id}`)}
      className="group cursor-pointer bg-white rounded-2xl border border-[#e8e0d0] card-shadow overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_8px_28px_rgba(60,40,20,0.13)]"
    >
      {/* Book cover strip */}
      <div
        className="h-2 w-full"
        style={{ backgroundColor: doc.cover_color }}
      />

      <div className="p-4">
        {/* Icon + type badge */}
        <div className="flex items-start justify-between mb-3">
          <div
            className="w-10 h-14 rounded-lg flex items-center justify-center text-xl shadow-sm flex-shrink-0"
            style={{ backgroundColor: doc.cover_color }}
          >
            {doc.file_type === 'pdf' ? '📕' : '📗'}
          </div>
          <span className="text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-full bg-[#f5f0e8] text-[#9c8870]">
            {doc.file_type}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-serif font-bold text-[#3d2f20] text-base leading-snug mb-1 line-clamp-2 group-hover:text-[#6b5744] transition-colors">
          {doc.title}
        </h3>

        {/* Meta */}
        <p className="text-[11px] text-[#b0a090] font-sans mb-3">
          {doc.word_count > 0 ? `${readingTime(doc.word_count)} min` : '--'} ·{' '}
          {formatDate(doc.created_at)}
        </p>

        {/* Progress */}
        <ProgressBar value={pct} color={doc.cover_color} height={5} />
        <p className="text-[10px] text-[#b0a090] font-sans mt-1">{pct}% read</p>
      </div>
    </motion.div>
  );
}
