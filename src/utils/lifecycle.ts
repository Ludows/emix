import type { EventContext, Slice, Unsubscribe } from "../types";

export function once<TState, TEvent extends string>(
  slice: Slice<TState, TEvent>,
  event: TEvent,
  handler: (state: TState) => void,
): Unsubscribe {
  return slice.once(event, (prev, next) => handler(next));
}

export function before<TState, TEvent extends string>(
  slice: Slice<TState, TEvent>,
  event: TEvent,
  handler: (state: TState, eventName: string) => Promise<void> | void,
): Unsubscribe {
  const bus = (slice as any)._bus;
  bus.use(async (ctx: EventContext<TState>, next: () => Promise<void>) => {
    if (ctx.event === event) {
      await handler(ctx.state, ctx.event);
    }
    await next();
  });
  return () => {};
}

export function after<TState, TEvent extends string>(
  slice: Slice<TState, TEvent>,
  event: TEvent,
  handler: (prev: TState, next: TState, diff: any[]) => void,
): Unsubscribe {
  return slice.on(event, handler);
}

export function around<TState, TEvent extends string>(
  slice: Slice<TState, TEvent>,
  event: TEvent,
  handler: (
    ctx: EventContext<TState>,
    next: () => Promise<void>,
  ) => Promise<void>,
): Unsubscribe {
  const bus = (slice as any)._bus;
  bus.use(async (ctx: EventContext<TState>, next: () => Promise<void>) => {
    if (ctx.event === event) {
      await handler(ctx, next);
    } else {
      await next();
    }
  });
  return () => {};
}

export function intercept<TState, TEvent extends string>(
  slice: Slice<TState, TEvent>,
  event: TEvent,
  handler: (ctx: EventContext<TState>, next: () => void) => void,
): Unsubscribe {
  const bus = (slice as any)._bus;
  bus.use(async (ctx: EventContext<TState>, next: () => Promise<void>) => {
    if (ctx.event === event) {
      let called = false;
      const nextCb = () => {
        called = true;
      };
      handler(ctx, nextCb);
      if (called) {
        await next();
      }
    } else {
      await next();
    }
  });
  return () => {};
}
