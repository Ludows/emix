import { useCallback, useEffect, useRef, useState } from "react";
import type { Slice } from "../types";
import { freeze } from "../utils/state";

export function useFreeze<TState, TEvent extends string>(
  slice: Slice<TState, TEvent>,
): [boolean, () => void, () => void] {
  const [isFrozen, setIsFrozen] = useState(false);
  const unfreezeRef = useRef<() => void>();

  const freezeFn = useCallback(() => {
    if (!isFrozen) {
      unfreezeRef.current = freeze(slice).unfreeze;
      setIsFrozen(true);
    }
  }, [slice, isFrozen]);

  const unfreezeFn = useCallback(() => {
    if (isFrozen && unfreezeRef.current) {
      unfreezeRef.current();
      unfreezeRef.current = undefined;
      setIsFrozen(false);
    }
  }, [isFrozen]);

  useEffect(() => {
    return () => {
      if (unfreezeRef.current) {
        unfreezeRef.current();
      }
    };
  }, []);

  return [isFrozen, freezeFn, unfreezeFn];
}
