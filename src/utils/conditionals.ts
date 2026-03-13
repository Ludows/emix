import type { EmitResult, MutatorFn, Slice } from "../types";

export function when<TState, TEvent extends string>(
  slice: Slice<TState, TEvent>,
  predicate: (state: TState) => boolean,
  event: TEvent,
  mutator: MutatorFn<TState>,
): EmitResult<TState> | undefined {
  if (predicate(slice.getState())) {
    return slice.emit(event, mutator);
  }
}

export function whenAll<TState, TEvent extends string>(
  slice: Slice<TState, TEvent>,
  predicates: Array<(state: TState) => boolean>,
  event: TEvent,
  mutator: MutatorFn<TState>,
): EmitResult<TState> | undefined {
  if (predicates.every((p) => p(slice.getState()))) {
    return slice.emit(event, mutator);
  }
}

export function whenAny<TState, TEvent extends string>(
  slice: Slice<TState, TEvent>,
  predicates: Array<(state: TState) => boolean>,
  event: TEvent,
  mutator: MutatorFn<TState>,
): EmitResult<TState> | undefined {
  if (predicates.some((p) => p(slice.getState()))) {
    return slice.emit(event, mutator);
  }
}

export function unless<TState, TEvent extends string>(
  slice: Slice<TState, TEvent>,
  predicate: (state: TState) => boolean,
  event: TEvent,
  mutator: MutatorFn<TState>,
): EmitResult<TState> | undefined {
  if (!predicate(slice.getState())) {
    return slice.emit(event, mutator);
  }
}
