import type { StateDiff, MutatorFn } from "./proxy.types";
import type { AnySlice } from "./slice.types";
import type { EmitResult, EventHandler, Unsubscribe } from "./events.types";

export interface Store<TSlices extends Record<string, AnySlice> = Record<string, AnySlice>> {
  getState(): { [K in keyof TSlices]: ReturnType<TSlices[K]["getState"]> };
  emit(event: string, mutator: MutatorFn<any>): EmitResult<any>;
  on(event: string, handler: EventHandler<any>): Unsubscribe;
  once(event: string, handler: EventHandler<any>): Unsubscribe;
  transaction(
    fn: (slices: TSlices) => void | Promise<void>,
  ): Promise<void>;
  emitBatch(
    events: Array<{ slice: string; event: string; mutator: (draft: any) => void }>,
  ): Promise<void>;
}

export interface StoreConfig {
  devtools?: boolean | { name: string };
  history?: boolean | { maxSize: number };
  strict?: boolean;
}

export interface SnapshotOptions<TEvents extends string> {
  only?: TEvents[];
  exclude?: TEvents[];
  equals?: <T>(prev: T, next: T) => boolean;
}

export interface HistoryEntry {
  id: string;
  event: string;
  timestamp: number;
  prevState: unknown;
  nextState: unknown;
  diff: StateDiff[];
}
