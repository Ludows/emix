import type { Slice } from "../types";
import { createSlice } from "../core/createSlice";

export function computed<TSelected>(
  dependencies: Slice<any, any>[],
  selector: (...states: any[]) => TSelected,
  options?: {
    equals?: (a: TSelected, b: TSelected) => boolean;
  },
): Slice<TSelected, never> {
  const equals = options?.equals ?? Object.is;

  const initialValue = selector(...dependencies.map((d) => d.getState()));
  const inner = createSlice<{ value: TSelected }, "$computed">({ value: initialValue });

  dependencies.forEach((dep) => {
    dep.on(undefined as any, () => {
      const prev = inner.getState().value;
      const next = selector(...dependencies.map((d) => d.getState()));

      if (!equals(prev, next)) {
        inner.emit("$computed", (draft: any) => {
          draft.value = next;
        });
      }
    });
  });

  const computedSlice: Slice<TSelected, never> = {
    getState(): TSelected {
      return inner.getState().value;
    },
    emit(): any {
      throw new Error("[emix] computed: computed slices are read-only and cannot emit events.");
    },
    on(_event: never, handler: any) {
      return inner.on(undefined as any, (prev: any, _next: any, diff: any[], ctx: any) => {
        return handler(prev.value, inner.getState().value, diff, ctx);
      });
    },
    once(_event: never, handler: any) {
      let active = true;
      const unsub = computedSlice.on(_event, (prev: any, next: any, diff: any[], ctx: any) => {
        if (!active) return;
        active = false;
        handler(prev, next, diff, ctx);
        unsub();
      });
      return unsub;
    },
    reset(): any {
      throw new Error("[emix] computed: computed slices are read-only and cannot be reset.");
    },
    offAll(): void {
      (inner as any)._bus?.emitter?.clearListeners();
    },
  };

  return computedSlice;
}
