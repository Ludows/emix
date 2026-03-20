import { useCallback, useRef, useSyncExternalStore } from "react";
import type { EventContext, Slice, SnapshotOptions, StateDiff } from "../types";

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

/**
 * Subscribe to all events on a slice without a type-unsafe `undefined as any`
 * scattered across hooks. The cast is intentional: `Slice.on` requires a typed
 * event key, but passing `undefined` to the underlying EventBus is the supported
 * mechanism for subscribing to every event. This is the single place that cast lives.
 */
function subscribeToAll<TState, TEvents extends string>(
  slice: Slice<TState, TEvents>,
  handler: (
    prev: TState,
    next: TState,
    diffs: StateDiff[],
    ctx: EventContext<TState>,
  ) => void,
): () => void {
  return (slice as any).on(undefined, handler);
}

export function useSnapshot<TState, TSelected, TEvents extends string>(
  slice: Slice<TState, TEvents>,
  selector: (state: TState) => TSelected,
  options?: SnapshotOptions<TEvents>,
): TSelected {
  // Validate unsupported options eagerly so callers get a clear error instead
  // of silently receiving unfiltered data.
  if (options?.only !== undefined || options?.exclude !== undefined) {
    throw new Error(
      "[emix] useSnapshot: 'only' and 'exclude' options are not yet supported. " +
        "Subscribe to specific events manually using slice.on().",
    );
  }

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const selectorRef = useRef(selector);
  selectorRef.current = selector;

  const selectionRef = useRef<TSelected>(selector(slice.getState()));
  const equals = options?.equals || shallowEqual;

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return subscribeToAll(
        slice,
        (_prev: TState, next: TState, _diffs: StateDiff[]) => {
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
