import type { MutatorFn, Slice } from "../types";

export function debounce<TState, TEvent extends string>(
  slice: Slice<TState, TEvent>,
  event: TEvent,
  ms: number,
  mutator: MutatorFn<TState>,
): () => void {
  let timeoutId: any;
  return () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      slice.emit(event, mutator);
    }, ms);
  };
}

export function throttle<TState, TEvent extends string>(
  slice: Slice<TState, TEvent>,
  event: TEvent,
  ms: number,
  mutator: MutatorFn<TState>,
): () => void {
  let lastRan = 0;
  return () => {
    const now = Date.now();
    if (now - lastRan >= ms) {
      slice.emit(event, mutator);
      lastRan = now;
    }
  };
}

export function delay<TState, TEvent extends string>(
  slice: Slice<TState, TEvent>,
  event: TEvent,
  ms: number,
  mutator: MutatorFn<TState>,
): { cancel: () => void } {
  const id = setTimeout(() => slice.emit(event, mutator), ms);
  return { cancel: () => clearTimeout(id) };
}

export function defer<TState, TEvent extends string>(
  slice: Slice<TState, TEvent>,
  event: TEvent,
  mutator: MutatorFn<TState>,
): void {
  if (typeof requestAnimationFrame !== "undefined") {
    requestAnimationFrame(() => slice.emit(event, mutator));
  } else {
    setTimeout(() => slice.emit(event, mutator), 0);
  }
}

export function idle<TState, TEvent extends string>(
  slice: Slice<TState, TEvent>,
  event: TEvent,
  mutator: MutatorFn<TState>,
): void {
  if (typeof requestIdleCallback !== "undefined") {
    requestIdleCallback(() => slice.emit(event, mutator));
  } else {
    setTimeout(() => slice.emit(event, mutator), 0);
  }
}
