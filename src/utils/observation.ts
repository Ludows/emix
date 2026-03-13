import type { Slice, StateDiff, Unsubscribe } from "../types";

export function tap<TState, TEvent extends string>(
  slice: Slice<TState, TEvent>,
  event: TEvent,
  handler: (state: TState) => void,
): Unsubscribe {
  return slice.on(event, (prev: any, next: any) => handler(next));
}

export function watch<TState, TEvent extends string>(
  slice: Slice<TState, TEvent>,
  path: string,
  handler: (value: any, prev: any, diffs: StateDiff[]) => void,
): Unsubscribe {
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
  return source.on(options.event as any, (prev: any, next: any) => {
    target.emit(options.targetEvent || ("$pipe" as any), (draft: any) =>
      mutator(next, draft),
    );
  });
}

export function map<TState, TEvent extends string>(
  source: Slice<TState, TEvent>,
  target: Slice<any, any>,
  selector: (state: TState) => any,
  targetKey: string,
): Unsubscribe {
  return source.on(undefined as any, (prev: any, next: any) => {
    target.emit("$map" as any, (draft: any) => {
      draft[targetKey] = selector(next);
    });
  });
}
