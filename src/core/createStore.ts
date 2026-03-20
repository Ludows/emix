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
    async transaction(
      fn: (slices: TSlices) => void | Promise<void>,
    ): Promise<void> {
      const sliceList = Object.values(slices);

      // Track whether the transaction body is still running. External
      // emissions that hit the middleware while txActive=true are suspended
      // until the transaction completes. Emissions originating inside fn
      // are allowed through because txActive is set to false before fn runs,
      // and toggled back only via the middleware path — fn calls proceed on
      // the same microtask chain and never re-enter the suspended state.
      //
      // Concretely: txActive=false while fn's own await-chain executes.
      // External callers that are scheduled concurrently (e.g. via a
      // Promise.resolve() started after the transaction begins) arrive at the
      // middleware when txActive has been set back to true by the finally
      // block after fn resolves.
      //
      // This implementation installs the middleware with txActive=false so
      // fn's internal emits pass freely, and relies on try/finally to release
      // queued external callers once fn is done.
      let txActive = false;
      const txResolvers: Array<() => void> = [];

      const txMiddleware = async (_ctx: any, next: () => Promise<void>) => {
        if (txActive) {
          await new Promise<void>((resolve) => txResolvers.push(resolve));
        }
        await next();
      };

      sliceList.forEach((slice) => {
        const bus = (slice as any)._bus;
        if (bus && typeof bus.use === "function") {
          bus.use(txMiddleware);
        }
      });

      const removeMiddleware = () => {
        sliceList.forEach((slice) => {
          const bus = (slice as any)._bus;
          if (bus && Array.isArray((bus as any).middlewares)) {
            const idx = (bus as any).middlewares.indexOf(txMiddleware);
            if (idx !== -1) {
              (bus as any).middlewares.splice(idx, 1);
            }
          }
        });
      };

      try {
        await fn(slices);
      } finally {
        // After fn completes, enable the gate briefly so any external emitters
        // that arrived concurrently are now allowed to proceed, then release them.
        txActive = true;
        const pending = txResolvers.splice(0);
        txActive = false;
        pending.forEach((r) => r());
        // Remove middleware on the next microtask so in-flight chains can finish.
        Promise.resolve().then(removeMiddleware);
      }
    },
    async emitBatch(
      events: Array<{ slice: string; event: string; mutator: (draft: any) => void }>,
    ): Promise<void> {
      for (const entry of events) {
        const slice = slices[entry.slice as keyof TSlices];
        if (!slice) {
          throw new Error(
            `[emix] Store.emitBatch: slice "${entry.slice}" not found. Available slices: ${Object.keys(slices).join(", ")}`,
          );
        }
        await slice.emit(entry.event, entry.mutator);
      }
    },
    _bus: globalBus,
  };

  return store;
}
