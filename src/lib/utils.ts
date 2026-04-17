import clsx, { type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** Returns a pastel cover color based on the document title */
export function getCoverColor(title: string): string {
  const colors = [
    '#d4e0b5', // pastel green
    '#b5d5e0', // pastel blue
    '#e0c9b5', // pastel orange
    '#d5b5e0', // pastel purple
    '#e0b5c0', // pastel rose
    '#b5e0d4', // pastel teal
    '#e0dab5', // pastel yellow
  ];
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

/** Estimates reading time in minutes from word count */
export function readingTime(wordCount: number): number {
  return Math.ceil(wordCount / 230);
}

/** Formats a date string to a friendly relative format */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
