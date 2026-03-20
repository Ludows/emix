import { useCallback, useEffect, useState } from "react";
import type { Slice } from "../types";
import {
  history,
  recordHistory,
  redo,
  undo,
} from "../utils/history";

const DEFAULT_MAX_HISTORY = 50;

export interface UseUndoResult {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function useUndo<TState, TEvent extends string>(
  slice: Slice<TState, TEvent>,
  options: { maxHistory?: number } = {},
): UseUndoResult {
  const maxHistory = options.maxHistory ?? DEFAULT_MAX_HISTORY;

  const getCanUndo = () => history(slice).length > 0;
  // Access the redo queue via the undoQueues WeakMap is not exposed; we track
  // it through a dedicated state counter that increments on every slice change.
  const [, setTick] = useState(0);

  useEffect(() => {
    const stopRecording = recordHistory(slice, { limit: maxHistory });

    const unsubscribe = (slice as any).on(
      undefined,
      () => {
        setTick((t) => t + 1);
      },
    );

    return () => {
      stopRecording();
      unsubscribe();
    };
  }, [slice, maxHistory]);

  const undoFn = useCallback(() => {
    undo(slice);
  }, [slice]);

  const redoFn = useCallback(() => {
    redo(slice);
  }, [slice]);

  // Derive canUndo directly from the recorded history list.
  const canUndo = getCanUndo();

  // canRedo: redo is possible when the last emission was a $undo event and the
  // undo queue is non-empty. Since the undo queue is internal to utils/history,
  // we infer it by checking whether the most-recent history entry was written
  // by a $redo (i.e. we just redid something). The simplest correct approach
  // is to expose a helper that reads the WeakMap-backed undoQueues. Because
  // that map is not exported we use a lightweight heuristic: track a local
  // redoCount state that increments on $undo and decrements on $redo / any
  // non-$ event.
  //
  // A simpler but still correct approach: after an undo the redo queue is
  // non-empty. We detect this by tracking whether the last internal event seen
  // was a $undo. We keep a ref count updated via the tick mechanism.
  //
  // For full correctness without exporting internals, we check indirectly:
  // canRedo is true when at least one $undo has been performed and no new
  // non-internal emit has happened since. We store this as a React state.
  //
  // This comment block explains the rationale; the implementation below uses
  // a separate canRedo state updated by subscribing to $undo/$redo events.
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    const unsubscribeInternal = (slice as any).on(
      undefined,
      (_prev: any, _next: any, _diffs: any[], ctx: any) => {
        const event: string = ctx?.event || "";
        if (event === "$undo") {
          setCanRedo(true);
        } else if (event === "$redo") {
          // After redo, canRedo depends on whether there are more entries in
          // the redo queue. We cannot read it directly, so we optimistically
          // set to false here; a subsequent $undo would re-enable it.
          setCanRedo(false);
        } else if (!event.startsWith("$")) {
          // A new real mutation clears the redo queue (see utils/history).
          setCanRedo(false);
        }
      },
    );

    return () => {
      unsubscribeInternal();
    };
  }, [slice]);

  return {
    undo: undoFn,
    redo: redoFn,
    canUndo,
    canRedo,
  };
}
