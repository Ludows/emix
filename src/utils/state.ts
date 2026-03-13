import type { Slice } from "../types";

export function fill<TState, TEvent extends string>(
  slice: Slice<TState, TEvent>,
  data: Partial<TState>,
): void {
  slice.emit("$fill" as TEvent, (draft: any) => {
    Object.assign(draft, data);
  });
}

const initialStates = new WeakMap<Slice<any, any>, any>();

export function reset<TState, TEvent extends string>(
  slice: Slice<TState, TEvent>,
): void {
  if (!initialStates.has(slice)) {
    initialStates.set(slice, structuredClone(slice.getState()));
  }
  const initial = initialStates.get(slice);
  slice.emit("$reset" as TEvent, (draft: any) => {
    Object.keys(draft).forEach((key) => delete draft[key]);
    Object.assign(draft, structuredClone(initial));
  });
}

export function forget<TState, TEvent extends string>(
  slice: Slice<TState, TEvent>,
): void {
  const bus = (slice as any)._bus;
  bus?.emitter?.clearListeners();
}

export function merge<TState, TEvent extends string>(
  slice: Slice<TState, TEvent>,
  data: Partial<TState>,
): void {
  slice.emit("$merge" as TEvent, (draft: any) => {
    for (const key in data) {
      if (
        data[key] !== null &&
        typeof data[key] === "object" &&
        draft[key] !== null &&
        typeof draft[key] === "object"
      ) {
        Object.assign(draft[key], data[key]);
      } else {
        draft[key] = data[key];
      }
    }
  });
}

const activeFreezes = new WeakMap<Slice<any, any>, { unfreeze: () => void }>();

export function freeze<TState, TEvent extends string>(
  slice: Slice<TState, TEvent>,
): { unfreeze: () => void } {
  if (activeFreezes.has(slice)) {
    return activeFreezes.get(slice)!;
  }

  let isFrozen = true;
  const resolvers = new Set<() => void>();

  const middleware = async (ctx: any, next: () => Promise<void>) => {
    if (isFrozen) {
      await new Promise<void>((resolve) => {
        resolvers.add(resolve);
      });
    }
    await next();
  };

  const bus = (slice as any)._bus;
  if (bus && typeof bus.use === "function") {
    bus.use(middleware);
  }

  const result = {
    unfreeze: () => {
      isFrozen = false;
      activeFreezes.delete(slice);
      const currentResolvers = Array.from(resolvers);
      resolvers.clear();
      currentResolvers.forEach((resolve) => resolve());
    },
  };

  activeFreezes.set(slice, result);
  return result;
}
