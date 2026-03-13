import { useCallback } from "react";
import type { Slice, SyncMutator } from "../types";

export function useEmit<TState, TEvent extends string>(
  slice: Slice<TState, TEvent>,
  event?: TEvent,
) {
  return useCallback(
    (
      evtOrMutator: TEvent | SyncMutator<TState>,
      mutator?: SyncMutator<TState>,
    ) => {
      if (event && typeof evtOrMutator === "function") {
        slice.emit(event, evtOrMutator);
      } else if (typeof evtOrMutator === "string" && mutator) {
        slice.emit(evtOrMutator as TEvent, mutator);
      }
    },
    [slice, event],
  );
}
