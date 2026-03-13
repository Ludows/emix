import type { EventContext, HistoryEntry, Slice } from "../types";

const histories = new WeakMap<Slice<any, any>, HistoryEntry[]>();
const undoQueues = new WeakMap<Slice<any, any>, HistoryEntry[]>();

export function recordHistory<TState, TEvent extends string>(
  slice: Slice<TState, TEvent>,
  options: { limit?: number } = {},
): () => void {
  const list: HistoryEntry[] = [];
  histories.set(slice, list);
  undoQueues.set(slice, []);

  return slice.on(
    undefined as any,
    (prev: any, next: any, diff: any[], ctx: EventContext<any>) => {
      // Ignore internal undo/redo events to avoid loops
      if (ctx?.event?.startsWith("$")) return;

      list.push({
        id: Math.random().toString(36).substring(7),
        event: ctx?.event || "unknown",
        prevState: structuredClone(prev),
        nextState: structuredClone(next),
        diff: diff || [],
        timestamp: Date.now(),
      });

      if (options.limit && list.length > options.limit) {
        list.shift();
      }

      // Clear redo queue on new manual change
      undoQueues.set(slice, []);
    },
  );
}

export function history<TState, TEvent extends string>(
  slice: Slice<TState, TEvent>,
): HistoryEntry[] {
  return histories.get(slice) || [];
}

export function undo<TState, TEvent extends string>(
  slice: Slice<TState, TEvent>,
): void {
  const list = histories.get(slice);
  if (!list || list.length === 0) return;

  const entry = list.pop()!;
  const redos = undoQueues.get(slice) || [];
  redos.push(entry);
  undoQueues.set(slice, redos);

  slice.emit("$undo" as TEvent, (draft: any) => {
    Object.keys(draft).forEach((key) => delete draft[key]);
    Object.assign(draft, structuredClone(entry.prevState));
  });
}

export function redo<TState, TEvent extends string>(
  slice: Slice<TState, TEvent>,
): void {
  const redos = undoQueues.get(slice) || [];
  if (redos.length === 0) return;

  const entry = redos.pop()!;
  const list = histories.get(slice) || [];
  list.push(entry);
  histories.set(slice, list);

  slice.emit("$redo" as TEvent, (draft: any) => {
    Object.keys(draft).forEach((key) => delete draft[key]);
    Object.assign(draft, structuredClone(entry.nextState));
  });
}

export function replayTo<TState, TEvent extends string>(
  slice: Slice<TState, TEvent>,
  entryId: string,
): void {
  const list = histories.get(slice) || [];
  const entry = list.find((e) => e.id === entryId);
  if (entry) {
    slice.emit("$replay" as TEvent, (draft: any) => {
      Object.keys(draft).forEach((key) => delete draft[key]);
      Object.assign(draft, structuredClone(entry.nextState));
    });
  }
}
