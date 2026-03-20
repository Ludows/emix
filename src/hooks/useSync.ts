import { useCallback, useRef, useSyncExternalStore } from "react";
import type { Slice } from "../types";

/**
 * Subscribe to all events on a slice without a type-unsafe `undefined as any`
 * scattered across hooks. The cast is intentional: `Slice.on` requires a typed
 * event key, but passing `undefined` to the underlying EventBus is the supported
 * mechanism for subscribing to every event. This is the single place that cast lives.
 */
function subscribeToAll<TState, TEvents extends string>(
  slice: Slice<TState, TEvents>,
  handler: () => void,
): () => void {
  return (slice as any).on(undefined, handler);
}

export function useSync<TSlices extends Slice<any, any>[]>(
  ...slices: TSlices
): {
  [K in keyof TSlices]: TSlices[K] extends Slice<infer S, any> ? S : never;
} {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const unsubscribes = slices.map((s) =>
        subscribeToAll(s, onStoreChange),
      );
      return () => unsubscribes.forEach((unsub) => unsub());
    },
    [slices],
  );

  const lastSnapshotRef = useRef<any[]>([]);

  const getSnapshot = useCallback(() => {
    const nextSnapshot = slices.map((s) => s.getState());
    const isSame =
      nextSnapshot.length === lastSnapshotRef.current.length &&
      nextSnapshot.every((val, i) => val === lastSnapshotRef.current[i]);

    if (isSame) {
      return lastSnapshotRef.current;
    }

    lastSnapshotRef.current = nextSnapshot;
    return nextSnapshot;
  }, [slices]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot) as any;
}
