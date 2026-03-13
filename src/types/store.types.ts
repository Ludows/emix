import type { StateDiff } from "./proxy.types";

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
