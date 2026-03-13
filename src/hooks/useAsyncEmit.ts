import { useCallback, useEffect, useRef, useState } from "react";
import type { AsyncMutator, AsyncStatus, Slice } from "../types";

export function useAsyncEmit<TState, TEvent extends string>(
  slice: Slice<TState, TEvent>,
  event: TEvent,
): [AsyncStatus, (mutator: AsyncMutator<TState>) => Promise<void>] {
  const [status, setStatus] = useState<AsyncStatus>({
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
    attempt: 0,
  });

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const mutate = useCallback(
    async (draftFn: (state: any) => Promise<void>) => {
      setStatus((s) => ({
        ...s,
        isPending: true,
        isSuccess: false,
        isError: false,
        error: null,
        attempt: s.attempt + 1,
      }));
      try {
        const promise = slice.emit(event, draftFn) as any;
        if (promise && promise.then) {
          await new Promise((res, rej) => promise.then(res).catch?.(rej));
        }
        if (isMounted.current) {
          setStatus((s) => ({ ...s, isPending: false, isSuccess: true }));
        }
      } catch (e) {
        if (isMounted.current) {
          setStatus((s) => ({
            ...s,
            isPending: false,
            isError: true,
            error: e as Error,
          }));
        }
      }
    },
    [slice, event],
  );

  return [status, mutate];
}
