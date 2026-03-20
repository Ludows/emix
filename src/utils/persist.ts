import type { Slice } from "../types";
import { fill } from "./state";

export function persist<TState, TEvent extends string>(
  slice: Slice<TState, TEvent>,
  options: {
    key: string;
    storage?: Storage;
    version?: number;
    migrate?: (savedState: unknown, savedVersion: number) => TState;
  },
): () => void {
  const version = options.version ?? 1;

  let storage: Storage | null = null;
  if (options.storage) {
    storage = options.storage;
  } else {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        storage = window.localStorage;
      }
    } catch {
      storage = null;
    }
  }

  if (!storage) {
    return () => {};
  }

  const resolvedStorage = storage;

  try {
    const raw = resolvedStorage.getItem(options.key);
    if (raw !== null) {
      const parsed = JSON.parse(raw) as { version: number; state: unknown };
      if (parsed.version === version) {
        fill(slice, parsed.state as Partial<TState>);
      } else if (options.migrate) {
        const migrated = options.migrate(parsed.state, parsed.version);
        fill(slice, migrated as Partial<TState>);
      }
      // If version differs and no migrate provided: silently ignore
    }
  } catch (err) {
    console.warn("[emix] persist: failed to load state from storage.", err);
  }

  const unsubscribe = slice.on(undefined as any, () => {
    try {
      const payload = { version, state: slice.getState() };
      resolvedStorage.setItem(options.key, JSON.stringify(payload));
    } catch (err) {
      console.warn("[emix] persist: failed to save state to storage.", err);
    }
  });

  return unsubscribe;
}
