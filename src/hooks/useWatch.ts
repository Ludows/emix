import { useEffect, useRef } from "react";
import type { Slice } from "../types";
import { watch } from "../utils/observation";

export function useWatch<TState, TEvent extends string>(
  slice: Slice<TState, TEvent>,
  path: string,
  callback: (value: any, prev: any) => void,
): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const unsubscribe = watch(slice, path, (value, prev) => {
      callbackRef.current(value, prev);
    });
    return unsubscribe;
  }, [slice, path]);
}
