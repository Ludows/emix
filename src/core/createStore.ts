import type {
  AnySlice,
  EmitResult,
  EventContext,
  EventHandler,
  MutatorFn,
  StoreConfig,
  Unsubscribe,
} from "../types";
import { EventBus } from "./bus";

export function createStore<TSlices extends Record<string, AnySlice>>(
  slices: TSlices,
  config?: StoreConfig,
) {
  const globalBus = new EventBus<any>();

  Object.entries(slices).forEach(([name, slice]) => {
    if ("_addParent" in slice) {
      (slice as any)._addParent(globalBus, name);
    }
  });

  const store = {
    ...slices,
    getState() {
      const state: any = {};
      for (const key in slices) {
        state[key] = slices[key as keyof TSlices]!.getState();
      }
      return state;
    },
    emit(event: string, mutator: MutatorFn<any>): EmitResult<any> {
      const parts = event.split("/");
      const sliceName = parts[0] as string;
      const sliceEvent = parts.slice(1).join("/");

      const slice = slices[sliceName as keyof TSlices];
      if (slice) {
        return slice.emit(sliceEvent, mutator);
      }
      throw new Error(
        `[emix] Store: slice "${sliceName}" not found. Available slices: ${Object.keys(slices).join(", ")}`,
      );
    },
    on(event: string, handler: EventHandler<any>): Unsubscribe {
      const busHandler = (ctx: EventContext<any>) => {
        handler(ctx.state, store.getState(), ctx.diff || [], ctx);
      };
      return globalBus.on(event, busHandler);
    },
    once(event: string, handler: EventHandler<any>): Unsubscribe {
      const busHandler = (ctx: EventContext<any>) => {
        handler(ctx.state, store.getState(), ctx.diff || [], ctx);
      };
      globalBus.once(event).then(busHandler);
      return () => globalBus.off(event, busHandler);
    },
    _bus: globalBus,
  };

  return store;
}
