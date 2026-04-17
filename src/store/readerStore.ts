import { create } from 'zustand';
import type { Annotation, HighlightColor } from '@/types';

interface SelectionState {
  text: string;
  range: Range | null;
  rect: DOMRect | null;
}

interface ReaderStore {
  // Tooltip & selection
  selection: SelectionState | null;
  setSelection: (s: SelectionState | null) => void;

  // Active highlight color
  activeColor: HighlightColor;
  setActiveColor: (c: HighlightColor) => void;

  // Note panel / modal
  notePanelOpen: boolean;
  setNotePanelOpen: (open: boolean) => void;

  // Annotation being edited (for note panel)
  editingAnnotation: Annotation | null;
  setEditingAnnotation: (a: Annotation | null) => void;

  // All annotations for current document
  annotations: Annotation[];
  setAnnotations: (annotations: Annotation[]) => void;
  addAnnotation: (annotation: Annotation) => void;
  updateAnnotation: (id: string, patch: Partial<Annotation>) => void;
  removeAnnotation: (id: string) => void;
}

export const useReaderStore = create<ReaderStore>((set) => ({
  selection: null,
  setSelection: (s) => set({ selection: s }),

  activeColor: 'yellow',
  setActiveColor: (c) => set({ activeColor: c }),

  notePanelOpen: false,
  setNotePanelOpen: (open) => set({ notePanelOpen: open }),

  editingAnnotation: null,
  setEditingAnnotation: (a) => set({ editingAnnotation: a }),

  annotations: [],
  setAnnotations: (annotations) => set({ annotations }),
  addAnnotation: (annotation) =>
    set((state) => ({ annotations: [...state.annotations, annotation] })),
  updateAnnotation: (id, patch) =>
    set((state) => ({
      annotations: state.annotations.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    })),
  removeAnnotation: (id) =>
    set((state) => ({ annotations: state.annotations.filter((a) => a.id !== id) })),
}));
