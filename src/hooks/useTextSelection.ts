'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useReaderStore } from '@/store/readerStore';

/**
 * Listens for mouseup events inside the container to detect completed text
 * selections. More reliable than `selectionchange` for drag-select flows.
 */
export function useTextSelection(containerRef: React.RefObject<HTMLElement | null>) {
  const setSelection = useReaderStore((s) => s.setSelection);
  const rafRef = useRef<number | null>(null);

  const readSelection = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      setSelection(null);
      return;
    }

    const text = sel.toString().trim();
    if (!text) {
      setSelection(null);
      return;
    }

    const range = sel.getRangeAt(0);
    const container = containerRef.current;
    if (container && !container.contains(range.commonAncestorContainer)) {
      setSelection(null);
      return;
    }

    const rect = range.getBoundingClientRect();
    setSelection({ text, range, rect });
  }, [containerRef, setSelection]);

  const handleMouseUp = useCallback(() => {
    // Defer one frame so the browser has time to finalise the selection
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(readSelection);
  }, [readSelection]);

  // Also clear when clicking somewhere that collapses the selection
  const handleMouseDown = useCallback((e: MouseEvent) => {
    // Only clear if click is outside a tooltip element
    const target = e.target as HTMLElement;
    if (!target.closest('[data-tooltip]')) {
      setSelection(null);
    }
  }, [setSelection]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      container.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousedown', handleMouseDown);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [handleMouseUp, handleMouseDown, containerRef]);
}

/**
 * Serialises a DOM Range to a JSON-safe position object using child-index paths.
 */
export function serializeRange(
  range: Range,
  container: HTMLElement
): { startOffset: number; endOffset: number; startContainerPath: string; endContainerPath: string } {
  function getNodePath(node: Node): string {
    const path: number[] = [];
    let current: Node | null = node;
    while (current && current !== container) {
      const parent = current.parentNode;
      if (!parent) break;
      path.unshift(Array.from(parent.childNodes).indexOf(current as ChildNode));
      current = parent;
    }
    return path.join('/');
  }

  return {
    startOffset: range.startOffset,
    endOffset: range.endOffset,
    startContainerPath: getNodePath(range.startContainer),
    endContainerPath: getNodePath(range.endContainer),
  };
}

/**
 * Restores a DOM Range from a serialized position object.
 */
export function deserializeRange(
  position: { startOffset: number; endOffset: number; startContainerPath: string; endContainerPath: string },
  container: HTMLElement
): Range | null {
  function getNodeFromPath(path: string): Node | null {
    if (!path) return container;
    const indices = path.split('/').map(Number);
    let current: Node = container;
    for (const index of indices) {
      if (!current.childNodes[index]) return null;
      current = current.childNodes[index];
    }
    return current;
  }

  try {
    const startNode = getNodeFromPath(position.startContainerPath);
    const endNode = getNodeFromPath(position.endContainerPath);
    if (!startNode || !endNode) return null;

    const range = document.createRange();
    range.setStart(startNode, position.startOffset);
    range.setEnd(endNode, position.endOffset);
    return range;
  } catch {
    return null;
  }
}
