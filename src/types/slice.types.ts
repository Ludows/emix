import type { EmitResult, EventHandler, Unsubscribe } from "./events.types";
import type { MutatorFn } from "./proxy.types";

export type SliceState = Record<string, unknown>;

export interface Slice<TState = any, TEvents extends string = string> {
  getState(): TState;
  emit<E extends TEvents>(
    event: E,
    mutator: MutatorFn<TState>,
  ): EmitResult<TState>;
  on<E extends TEvents>(event: E, handler: EventHandler<TState>): Unsubscribe;
  once<E extends TEvents>(event: E, handler: EventHandler<TState>): Unsubscribe;
}

export type AnySlice = Slice<SliceState, string>;
export type InferSliceState<TSlice> =
  TSlice extends Slice<infer TState, any> ? TState : never;
