'use client';

import { useEffect, useRef, useCallback } from 'react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

const SAVE_INTERVAL_MS = 3000;

export function useReadingProgress(documentId: string) {
  // Stable ref — never recreated between renders
  const clientRef = useRef(isSupabaseConfigured() ? createClient() : null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveProgress = useCallback(
    async (pct: number) => {
      const supabase = clientRef.current;
      if (!supabase) return; // Demo mode — skip saving

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('reading_progress').upsert(
        {
          user_id: user.id,
          document_id: documentId,
          scroll_pct: Math.round(pct),
          last_read: new Date().toISOString(),
        },
        { onConflict: 'user_id,document_id' }
      );
    },
    [documentId]
  );

  const handleScroll = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const el = document.documentElement;
      const scrolled = el.scrollTop;
      const total = el.scrollHeight - el.clientHeight;
      const pct = total > 0 ? (scrolled / total) * 100 : 0;
      saveProgress(pct);
    }, SAVE_INTERVAL_MS);
  }, [saveProgress]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [handleScroll]);
}
