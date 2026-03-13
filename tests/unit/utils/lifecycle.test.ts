import { describe, expect, it, vi } from "vitest";
import { createSlice } from "../../../src/core/createSlice";
import {
  after,
  around,
  before,
  intercept,
  once,
} from "../../../src/utils/lifecycle";

describe("Lifecycle utilities", () => {
  it("once() executes only once", async () => {
    const slice = createSlice({ count: 0 });
    const handler = vi.fn();
    once(slice, "test" as any, handler);

    await slice.emit("test" as any, () => {});
    await slice.emit("test" as any, () => {});

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("before() executes middleware before mutation", async () => {
    const slice = createSlice({ count: 0 });
    const order: string[] = [];

    before(slice, "inc" as any, async () => {
      order.push("before");
    });

    await slice.emit("inc" as any, () => {
      order.push("mutation");
    });

    expect(order).toEqual(["before", "mutation"]);
  });

  it("after() executes middleware after mutation", async () => {
    const slice = createSlice({ count: 0 });
    const order: string[] = [];

    after(slice, "inc" as any, async () => {
      order.push("after");
    });

    await slice.emit("inc" as any, () => {
      order.push("mutation");
    });

    expect(order).toEqual(["mutation", "after"]);
  });

  it("around() wraps mutation", async () => {
    const slice = createSlice({ count: 0 });
    const order: string[] = [];

    around(slice, "inc" as any, async (ctx, next) => {
      order.push("start");
      await next();
      order.push("end");
    });

    await slice.emit("inc" as any, () => {
      order.push("mutation");
    });

    expect(order).toEqual(["start", "mutation", "end"]);
  });

  it("intercept() can modify or block mutation", async () => {
    const slice = createSlice({ count: 0 });

    // Block if count >= 1
    intercept(slice, "set" as any, (ctx, next) => {
      if (ctx.state.count >= 1) {
        return; // block
      }
      next();
    });

    await slice.emit("set" as any, (d) => {
      d.count = 1;
    });
    expect(slice.getState().count).toBe(1);

    await slice.emit("set" as any, (d) => {
      d.count = 2;
    });
    expect(slice.getState().count).toBe(1); // blocked because count was already 1
  });
  it("around() ignores other events", async () => {
    const slice = createSlice({ count: 0 });
    const handler = vi.fn(async (ctx, next) => {
      await next();
    });
    around(slice, "test" as any, handler);

    await slice.emit("other" as any, (d) => {
      d.count++;
    });
    expect(handler).not.toHaveBeenCalled();
    expect(slice.getState().count).toBe(1);
  });

  it("intercept() ignores other events", async () => {
    const slice = createSlice({ count: 0 });
    const handler = vi.fn((ctx, next) => {
      next();
    });
    intercept(slice, "test" as any, handler);

    await slice.emit("other" as any, (d) => {
      d.count++;
    });
    expect(handler).not.toHaveBeenCalled();
    expect(slice.getState().count).toBe(1);
  });
});
