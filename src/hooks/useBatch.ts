import { useCallback, useRef } from "react";
import { unstable_batchedUpdates } from "react-dom";

type BatchFn = (fn: () => void) => void;

function resolveBatchFn(): BatchFn {
  // React 18 batches updates automatically inside event handlers, but for
  // updates triggered outside React (e.g. from setTimeout / promises) we can
  // still opt-in to explicit batching via ReactDOM.unstable_batchedUpdates.
  if (typeof unstable_batchedUpdates === "function") {
    return unstable_batchedUpdates as BatchFn;
  }
  // Fallback: execute the callback directly.
  return (fn: () => void) => fn();
}

const _batchFn = resolveBatchFn();

export function useBatch(): BatchFn {
  const batchRef = useRef<BatchFn>(_batchFn);

  return useCallback((fn: () => void) => {
    batchRef.current(fn);
  }, []);
}
