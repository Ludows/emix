import type { Slice, StateDiff, Unsubscribe } from "../types";

const _inFlight = new Set<object>();
const _MAX_PIPE_DEPTH = 50;
let _pipeDepth = 0;

export function tap<TState, TEvent extends string>(
  slice: Slice<TState, TEvent>,
  event: TEvent,
  handler: (state: TState) => void,
): Unsubscribe {
  return slice.on(event, (prev: any, next: any) => handler(next));
}

function validatePath(path: string): void {
  if (typeof path !== "string" || path.length === 0) {
    throw new Error("[emix] watch: path must be a non-empty string.");
  }
  if (path.startsWith(".") || path.endsWith(".")) {
    throw new Error(`[emix] watch: path "${path}" must not start or end with a dot.`);
  }
  if (path.includes("..")) {
    throw new Error(`[emix] watch: path "${path}" must not contain consecutive dots.`);
  }
}

export function watch<TState, TEvent extends string>(
  slice: Slice<TState, TEvent>,
  path: string,
  handler: (value: any, prev: any, diffs: StateDiff[]) => void,
): Unsubscribe {
  validatePath(path);
  return slice.on(
    undefined as any,
    (prev: any, next: any, diffs: StateDiff[]) => {
      const isAffected = diffs.some(
        (d) =>
          d.path.join(".") === path || d.path.join(".").startsWith(path + "."),
      );
      if (isAffected) {
        const getVal = (obj: any) =>
          path.split(".").reduce((acc, part) => acc?.[part], obj);
        handler(getVal(next), getVal(prev), diffs);
      }
    },
  );
}

export function watchDeep<TState, TEvent extends string>(
  slice: Slice<TState, TEvent>,
  path: string,
  handler: (diffs: StateDiff[]) => void,
): Unsubscribe {
  validatePath(path);
  return slice.on(
    undefined as any,
    (prev: any, next: any, diffs: StateDiff[]) => {
      const relevantDiffs = diffs.filter(
        (d) =>
          d.path.join(".") === path || d.path.join(".").startsWith(path + "."),
      );
      if (relevantDiffs.length > 0) {
        handler(relevantDiffs);
      }
    },
  );
}

export function pipe<TState, TEvent extends string>(
  source: Slice<TState, TEvent>,
  target: Slice<any, any>,
  mutator: (sourceState: TState, targetDraft: any) => void,
  options: { event?: TEvent; targetEvent?: string } = {},
): Unsubscribe {
  return source.on(options.event as any, async (_prev: any, next: any) => {
    if (_inFlight.has(target)) {
      console.warn("[emix] pipe: cycle detected, skipping emission to prevent infinite loop.");
      return;
    }
    if (_pipeDepth >= _MAX_PIPE_DEPTH) {
      console.warn("[emix] pipe: max recursion depth reached, skipping emission.");
      return;
    }
    _inFlight.add(target);
    _pipeDepth++;
    try {
      await target.emit(options.targetEvent || ("$pipe" as any), (draft: any) =>
        mutator(next, draft),
      );
    } finally {
      _pipeDepth--;
      _inFlight.delete(target);
    }
  });
}

export function map<TState, TEvent extends string>(
  source: Slice<TState, TEvent>,
  target: Slice<any, any>,
  selector: (state: TState) => any,
  targetKey: string,
): Unsubscribe {
  return source.on(undefined as any, (prev: any, next: any) => {
    if (_inFlight.has(target)) {
      console.warn("[emix] map: cycle detected, skipping emission to prevent infinite loop.");
      return;
    }
    if (_pipeDepth >= _MAX_PIPE_DEPTH) {
      console.warn("[emix] map: max recursion depth reached, skipping emission.");
      return;
    }
    _inFlight.add(target);
    _pipeDepth++;
    try {
      target.emit("$map" as any, (draft: any) => {
        draft[targetKey] = selector(next);
      });
    } finally {
      _pipeDepth--;
      _inFlight.delete(target);
    }
  });
}
