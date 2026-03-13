export type Draft<T> = T extends object
  ? { -readonly [K in keyof T]: Draft<T[K]> }
  : T;

export interface StateDiff {
  path: string[];
  prev: unknown;
  next: unknown;
  type: "set" | "delete" | "array/push" | "array/splice" | "array/sort";
}

export type MutatorFn<TState> = SyncMutator<TState> | AsyncMutator<TState>;
export type SyncMutator<TState> = (state: Draft<TState>) => void;
export type AsyncMutator<TState> = (state: Draft<TState>) => Promise<void>;

export type IsAsync<T extends MutatorFn<any>> =
  T extends AsyncMutator<any> ? true : false;
