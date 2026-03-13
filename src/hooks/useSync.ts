import { useCallback, useRef, useSyncExternalStore } from "react";
import type { Slice } from "../types";

export function useSync<TSlices extends Slice<any, any>[]>(
  ...slices: TSlices
): {
  [K in keyof TSlices]: TSlices[K] extends Slice<infer S, any> ? S : never;
} {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const unsubscribes = slices.map((s) =>
        s.on(undefined as any, onStoreChange),
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
