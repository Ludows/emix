import type { Slice, SliceState } from "../types";
import { createSlice } from "../core/createSlice";

export function cloneSlice<TState extends SliceState, TEvent extends string>(
  source: Slice<TState, TEvent>,
  override?: Partial<TState>,
): Slice<TState, TEvent> {
  const clonedState = structuredClone(source.getState());

  if (override) {
    Object.assign(clonedState, override);
  }

  return createSlice<TState, TEvent>(clonedState);
}
