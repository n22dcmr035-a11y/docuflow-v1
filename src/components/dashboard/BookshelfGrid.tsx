'use client';

import { DocumentCard } from './DocumentCard';
import type { Document } from '@/types';

interface BookshelfGridProps {
  documents: Document[];
}

export function BookshelfGrid({ documents }: BookshelfGridProps) {
  if (documents.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">📚</div>
        <p className="text-[#9c8870] font-sans text-base">
          Your bookshelf is empty. Upload a document to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {documents.map((doc, i) => (
        <DocumentCard key={doc.id} document={doc} index={i} />
      ))}
    </div>
  );
}
