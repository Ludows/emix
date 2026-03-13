import type { EventContext } from "../types";
import { fill } from "../utils/state";

export interface DevToolsOptions {
  name?: string;
  trace?: boolean;
}

/**
 * Connects an Emix store to Redux DevTools.
 * Allows visual debugging and jump-to-state support.
 */
export function devtools(store: any, options: DevToolsOptions = {}) {
  if (typeof window === "undefined") return () => {};

  const extension = (window as any).__REDUX_DEVTOOLS_EXTENSION__;
  if (!extension) {
    return () => {};
  }

  const devTools = extension.connect({
    name: options.name || "Emix Store",
    trace: options.trace || false,
  });

  devTools.init(store.getState());

  // Listen to all events on the store's global bus
  const unsub = store._bus.on(undefined, (ctx: EventContext<any>) => {
    // Skip internal events to avoid flooding DevTools?
    // Usually $ prefixed events are internal ($fill, $reset, etc.)
    devTools.send(
      {
        type: ctx.event,
        payload: ctx.diff,
        meta: ctx.meta,
      },
      store.getState(),
    );
  });

  // Handle messages from DevTools (e.g., Jump to State)
  const devToolsUnsub = devTools.subscribe((message: any) => {
    if (
      message.type === "DISPATCH" &&
      (message.payload.type === "JUMP_TO_STATE" ||
        message.payload.type === "JUMP_TO_ACTION")
    ) {
      const newState = JSON.parse(message.state);
      // Synchronize all slices with the new state
      Object.keys(newState).forEach((key) => {
        const slice = store[key];
        if (slice && typeof slice.emit === "function") {
          // Use $fill to update state without recursion issues
          fill(slice, newState[key]);
        }
      });
    }
  });

  return () => {
    unsub();
    if (devToolsUnsub && typeof devToolsUnsub === "function") {
      (devToolsUnsub as any)();
    }
  };
}
