import { describe, expect, it, vi } from "vitest";
import { EventBus } from "../../../src/core/bus";

describe("EventBus system", () => {
  it("executes middleware in order", async () => {
    const bus = new EventBus();
    const order: number[] = [];

    bus.use(async (ctx, next) => {
      order.push(1);
      await next();
      order.push(4);
    });

    bus.use(async (ctx, next) => {
      order.push(2);
      await next();
      order.push(3);
    });

    const context = { event: "test", state: {}, draft: {}, meta: {} };
    await bus.emitAsync(context, async () => {
      order.push(0);
    });

    expect(order).toEqual([1, 2, 0, 3, 4]);
  });

  it("can cancel mutation by not calling next()", async () => {
    const bus = new EventBus();
    let mutated = false;

    bus.use(async (ctx, next) => {
      // block mutation
    });

    const context = { event: "test", state: {}, draft: {}, meta: {} };
    await bus.emitAsync(context, async () => {
      mutated = true;
    });

    expect(mutated).toBe(false);
  });

  it("can modify context.meta between middlewares", async () => {
    const bus = new EventBus();
    const context = {
      event: "test",
      state: {},
      draft: {},
      meta: { count: 0 },
    } as any;

    bus.use(async (ctx, next) => {
      ctx.meta.count = 1;
      await next();
    });

    await bus.emitAsync(context, async () => {});
    expect(context.meta.count).toBe(1);
  });

  it("receives correct diff after mutation", async () => {
    const bus = new EventBus();
    const context = {
      event: "test",
      state: {},
      draft: {},
      meta: {},
      diff: [] as any[],
    } as any;

    let receivedDiff: any;
    bus.use(async (ctx, next) => {
      await next();
      receivedDiff = ctx.diff;
    });

    await bus.emitAsync(context, async () => {
      context.diff = [{ path: ["a"], type: "set", prev: 0, next: 1 }];
    });

    expect(receivedDiff).toBeDefined();
    expect(receivedDiff[0].type).toBe("set");
  });

  it("async middleware awaits correctly", async () => {
    const bus = new EventBus();
    const context = { event: "test", state: {}, draft: {}, meta: {} } as any;
    let waited = false;

    bus.use(async (ctx, next) => {
      await new Promise((r) => setTimeout(r, 10));
      waited = true;
      await next();
    });

    await bus.emitAsync(context, async () => {});
    expect(waited).toBe(true);
  });

  it("emitAsync propagates middleware errors", async () => {
    const bus = new EventBus();
    const context = { event: "test", state: {}, draft: {}, meta: {} } as any;

    bus.use(async () => {
      throw new Error("async error");
    });

    await expect(bus.emitAsync(context, async () => {})).rejects.toThrow(
      "async error",
    );
  });

  it("emitSync swallows and logs middleware errors", async () => {
    const bus = new EventBus();
    const context = { event: "test", state: {}, draft: {}, meta: {} } as any;
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    bus.use(async () => {
      throw new Error("sync error");
    });

    bus.emitSync(context, () => {});

    // emitSync catches errors in the microtask chain if it returns a promise
    await new Promise((r) => setTimeout(r, 0));

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
  it("once() resolves with context", async () => {
    const bus = new EventBus();
    const context = { event: "test", state: {}, draft: {}, meta: {} } as any;

    setTimeout(() => bus.emitAsync(context, async () => {}), 10);

    const result = await bus.once("test");
    expect(result).toBe(context);
  });

  it("supports AbortSignal in on()", async () => {
    const bus = new EventBus();
    const controller = new AbortController();
    const handler = vi.fn();

    bus.on("test", handler, controller.signal);
    controller.abort();

    await bus.emitAsync({ event: "test" } as any, async () => {});
    expect(handler).not.toHaveBeenCalled();
  });

  it("emitSync supports async middleware via internal promise handling", async () => {
    const bus = new EventBus();
    const context = { event: "test", state: {}, draft: {}, meta: {} } as any;
    let finished = false;

    bus.use(async (ctx, next) => {
      await new Promise((r) => setTimeout(r, 10));
      await next();
      finished = true;
    });

    bus.emitSync(context, () => {});
    expect(finished).toBe(false);

    await new Promise((r) => setTimeout(r, 20));
    expect(finished).toBe(true);
  });

  it("emitSync supports truly synchronous middleware", () => {
    const bus = new EventBus();
    const context = { event: "test", state: {}, draft: {}, meta: {} } as any;
    let count = 0;

    bus.use(((ctx: any, next: any) => {
      count++;
      next();
      count++;
    }) as any);

    bus.emitSync(context, () => {
      count += 10;
    });

    expect(count).toBe(12);
  });
});
