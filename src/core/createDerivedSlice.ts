import type { AnySlice, EventContext, EventHandler } from "../types";

export function createDerivedSlice<TSelected>(
  dependencies: AnySlice[],
  selector: (...states: any[]) => TSelected,
) {
  function getState(): TSelected {
    return selector(...dependencies.map((d) => d.getState()));
  }

  return {
    getState,
    emit() {
      throw new Error("Derived slices are read-only and cannot emit events");
    },
    on(event: string, handler: EventHandler<TSelected>) {
      const busHandler = (
        prev: any,
        next: any,
        diff: any[],
        ctx: EventContext<any>,
      ) => {
        // For derived slices, we compute the next value and pass it as nextState
        // We don't have a clean way to compute the "prev" derived state easily without storing it
        // but for reactivity, nextState is the most important.
        handler(getState(), getState(), [], ctx);
      };

      const unsubs = dependencies.map((d) =>
        d.on(undefined as any, busHandler),
      );
      return () => unsubs.forEach((u) => u());
    },
    once(event: string, handler: EventHandler<TSelected>) {
      let active = true;
      const unsub = this.on(event, (prev, next, diff, ctx) => {
        if (!active) return;
        active = false;
        handler(prev, next, diff, ctx);
        unsub();
      });
      return unsub;
    },
    reset() {
      throw new Error("Derived slices are read-only and cannot be reset");
    },
    offAll(_event?: string) {
      // no-op: derived slices manage no listeners of their own
    },
    _isDerived: true,
  };
}
