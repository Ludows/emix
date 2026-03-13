import type { Draft, StateDiff } from "./proxy.types";
import type { AnySlice, InferSliceState, Slice } from "./slice.types";

export type Unsubscribe = () => void;

export interface EventContext<TState> {
  event: string;
  state: TState;
  draft: Draft<TState>;
  diff?: StateDiff[];
  meta: Record<string, unknown>;
}

export type Middleware<TState> = (
  context: EventContext<TState>,
  next: () => Promise<void>,
) => Promise<void>;

export type EventHandler<TState> = (
  prev: TState,
  next: TState,
  diff: StateDiff[],
  context: EventContext<TState>,
) => void;

export interface EmitResult<TState> {
  pipe: (...fns: Array<(state: TState) => void>) => EmitResult<TState>;
  then: (fn: (state: TState) => void) => EmitResult<TState>;
}

export interface EventError<TEvent extends string, TPayload = unknown> {
  event: TEvent;
  error: Error;
  payload?: TPayload;
  attempt?: number;
}

export type StoreError<TEvents extends string> = {
  [E in TEvents]: EventError<E>;
}[TEvents];

export type InferEventNames<TSlice> =
  TSlice extends Slice<any, infer TEvents> ? TEvents : never;

export type InferSliceEvents<TSlices extends Record<string, AnySlice>> = {
  [K in keyof TSlices & string]: `${K}/${InferEventNames<TSlices[K]>}`;
}[keyof TSlices & string];

export type InferGlobalState<TSlices extends Record<string, AnySlice>> = {
  [K in keyof TSlices]: InferSliceState<TSlices[K]>;
};

export type InferStateFromEvent<
  TSlices extends Record<string, AnySlice>,
  TEvent extends string,
> = TEvent extends `${infer TSliceName}/${string}`
  ? TSliceName extends keyof TSlices
    ? InferSliceState<TSlices[TSliceName]>
    : never
  : InferGlobalState<TSlices>;
