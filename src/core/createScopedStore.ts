import type { SliceState } from "../types";
import { createSlice } from "./createSlice";

export function createScopedStore<TState extends SliceState>(
  initialState: TState,
) {
  return createSlice(initialState);
}
