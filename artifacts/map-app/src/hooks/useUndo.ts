import { useState, useCallback } from "react";
import { MapElement } from "@/lib/db";

interface UndoState {
  elements: MapElement[];
}

export function useUndo(initialElements: MapElement[]) {
  const [history, setHistory] = useState<UndoState[]>([]);
  const [future, setFuture] = useState<UndoState[]>([]);
  const [current, setCurrent] = useState<MapElement[]>(initialElements);

  const push = useCallback((elements: MapElement[]) => {
    setHistory((h) => [...h.slice(-20), { elements: current }]);
    setFuture([]);
    setCurrent(elements);
  }, [current]);

  const undo = useCallback((): MapElement[] | null => {
    if (history.length === 0) return null;
    const prev = history[history.length - 1];
    setFuture((f) => [{ elements: current }, ...f]);
    setHistory((h) => h.slice(0, -1));
    setCurrent(prev.elements);
    return prev.elements;
  }, [history, current]);

  const redo = useCallback((): MapElement[] | null => {
    if (future.length === 0) return null;
    const next = future[0];
    setHistory((h) => [...h, { elements: current }]);
    setFuture((f) => f.slice(1));
    setCurrent(next.elements);
    return next.elements;
  }, [future, current]);

  const canUndo = history.length > 0;
  const canRedo = future.length > 0;

  return { undo, redo, push, canUndo, canRedo };
}
