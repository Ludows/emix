import { useCallback, useEffect, useRef, useState } from "react";
import type { Slice, StateDiff } from "../types";

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

export function useDebounced<TState, TSelected, TEvent extends string>(
  slice: Slice<TState, TEvent>,
  selector: (state: TState) => TSelected,
  delay: number,
  equals: (a: TSelected, b: TSelected) => boolean = shallowEqual,
): TSelected {
  const selectorRef = useRef(selector);
  selectorRef.current = selector;

  const equalsRef = useRef(equals);
  equalsRef.current = equals;

  const [value, setValue] = useState<TSelected>(() =>
    selector(slice.getState()),
  );

  const pendingRef = useRef<TSelected>(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const subscribe = useCallback(
    (handler: (prev: TState, next: TState, diffs: StateDiff[]) => void) => {
      return (slice as any).on(undefined, handler);
    },
    [slice],
  );

  useEffect(() => {
    const unsubscribe = subscribe((_prev: TState, next: TState) => {
      const newValue = selectorRef.current(next);
      if (equalsRef.current(pendingRef.current, newValue)) return;
      pendingRef.current = newValue;

      if (timerRef.current !== undefined) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        timerRef.current = undefined;
        setValue(newValue);
      }, delay);
    });

    return () => {
      unsubscribe();
      if (timerRef.current !== undefined) {
        clearTimeout(timerRef.current);
        timerRef.current = undefined;
      }
    };
  }, [slice, delay, subscribe]);

  return value;
}
