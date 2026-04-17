'use client';

import { useCallback, useRef } from 'react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { useReaderStore } from '@/store/readerStore';
import type { Annotation, HighlightColor, AnnotationPosition } from '@/types';

export function useAnnotations(documentId: string) {
  // Stable ref — never changes between renders, so safe in useCallback deps
  const clientRef = useRef(isSupabaseConfigured() ? createClient() : null);
  const { addAnnotation, updateAnnotation, removeAnnotation, setAnnotations } = useReaderStore();

  const loadAnnotations = useCallback(async () => {
    const supabase = clientRef.current;
    if (!supabase) return;

    const { data, error } = await supabase
      .from('annotations')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setAnnotations(data as Annotation[]);
    }
  }, [documentId, setAnnotations]);

  const createAnnotation = useCallback(
    async (
      highlightedText: string,
      position: AnnotationPosition,
      color: HighlightColor = 'yellow',
      noteContent?: string
    ): Promise<Annotation | null> => {
      const supabase = clientRef.current;
      if (!supabase) {
        // Demo mode: create a local-only annotation
        const localAnn: Annotation = {
          id: `local-${Date.now()}`,
          user_id: 'demo',
          document_id: documentId,
          highlighted_text: highlightedText,
          position,
          note_content: noteContent ?? null,
          color,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        addAnnotation(localAnn);
        return localAnn;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('annotations')
        .insert({
          user_id: user.id,
          document_id: documentId,
          highlighted_text: highlightedText,
          position,
          color,
          note_content: noteContent ?? null,
        })
        .select()
        .single();

      if (!error && data) {
        addAnnotation(data as Annotation);
        return data as Annotation;
      }
      return null;
    },
    [documentId, addAnnotation]
  );

  const saveNote = useCallback(
    async (annotationId: string, noteContent: string) => {
      const supabase = clientRef.current;
      if (!supabase) {
        // Demo mode: update in-memory only
        updateAnnotation(annotationId, { note_content: noteContent });
        return;
      }

      const { error } = await supabase
        .from('annotations')
        .update({ note_content: noteContent, updated_at: new Date().toISOString() })
        .eq('id', annotationId);

      if (!error) {
        updateAnnotation(annotationId, { note_content: noteContent });
      }
    },
    [updateAnnotation]
  );

  const deleteAnnotation = useCallback(
    async (annotationId: string) => {
      const supabase = clientRef.current;
      if (supabase) {
        await supabase.from('annotations').delete().eq('id', annotationId);
      }
      removeAnnotation(annotationId);
    },
    [removeAnnotation]
  );

  return { loadAnnotations, createAnnotation, saveNote, deleteAnnotation };
}
