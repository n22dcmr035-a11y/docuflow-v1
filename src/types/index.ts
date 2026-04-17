export interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Document {
  id: string;
  user_id: string;
  title: string;
  file_name: string;
  file_type: 'pdf' | 'docx';
  storage_path: string;
  parsed_html: string | null;
  word_count: number;
  cover_color: string;
  created_at: string;
  updated_at: string;
  // joined from reading_progress
  scroll_pct?: number;
  last_read?: string;
}

export interface ReadingProgress {
  id: string;
  user_id: string;
  document_id: string;
  scroll_pct: number;
  last_read: string;
}

export interface AnnotationPosition {
  startOffset: number;
  endOffset: number;
  startContainerPath: string;
  endContainerPath: string;
}

export interface Annotation {
  id: string;
  user_id: string;
  document_id: string;
  highlighted_text: string;
  position: AnnotationPosition;
  note_content: string | null;
  color: 'yellow' | 'green' | 'blue' | 'pink';
  created_at: string;
  updated_at: string;
}

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink';

export const HIGHLIGHT_COLORS: Record<HighlightColor, { bg: string; label: string }> = {
  yellow: { bg: '#fef08a', label: 'Yellow' },
  green:  { bg: '#bbf7d0', label: 'Green' },
  blue:   { bg: '#bae6fd', label: 'Blue' },
  pink:   { bg: '#fbcfe8', label: 'Pink' },
};
