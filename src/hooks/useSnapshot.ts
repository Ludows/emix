import { useCallback, useRef, useSyncExternalStore } from "react";
import type { Slice, SnapshotOptions, StateDiff } from "../types";

function shallowEqual<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true;
  if (
    typeof a !== "object" ||
    a === null ||
    typeof b !== "object" ||
    b === null
  )
    return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (let i = 0; i < keysA.length; i++) {
    if (
      !Object.prototype.hasOwnProperty.call(b, keysA[i]!) ||
      (a as any)[keysA[i]!] !== (b as any)[keysA[i]!]
    ) {
      return false;
    }
  }
  return true;
}

export function useSnapshot<TState, TSelected, TEvents extends string>(
  slice: Slice<TState, TEvents>,
  selector: (state: TState) => TSelected,
  options?: SnapshotOptions<TEvents>,
): TSelected {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const selectorRef = useRef(selector);
  selectorRef.current = selector;

  const selectionRef = useRef<TSelected>(selector(slice.getState()));
  const equals = options?.equals || shallowEqual;

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return slice.on(
        undefined as any,
        (prev: any, next: any, diffs: StateDiff[]) => {
          const opts = optionsRef.current;

          // If there's an event scope, we'd need event context here.
          // But currently slice.on `prev, next, diffs` doesn't pass the event name.
          // To fully support `only` and `exclude`, the bus needs to pass the event name.
          // Assuming for now re-render optimization with selectors:

          const newSelection = selectorRef.current(next);
          if (!equals(selectionRef.current, newSelection)) {
            selectionRef.current = newSelection;
            onStoreChange();
          }
        },
      );
    },
    [slice, equals],
  );

  const getSnapshot = useCallback(() => {
    return selectionRef.current;
  }, []);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
