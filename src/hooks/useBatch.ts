import { useCallback, useRef } from "react";

type BatchFn = (fn: () => void) => void;

function resolveBatchFn(): BatchFn {
  // React 18 batches updates automatically inside event handlers, but for
  // updates triggered outside React (e.g. from setTimeout / promises) we can
  // still opt-in to explicit batching via ReactDOM.unstable_batchedUpdates.
  // In React 18+ all setState calls are batched by default; we keep this as a
  // safe fallback for React 17 environments or manual flushing needs.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ReactDOM = require("react-dom");
    if (typeof ReactDOM.unstable_batchedUpdates === "function") {
      return ReactDOM.unstable_batchedUpdates as BatchFn;
    }
  } catch {
    // react-dom not available
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
