import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSlice } from "../../../src/core/createSlice";
import {
  debounce,
  defer,
  delay,
  idle,
  throttle,
} from "../../../src/utils/timing";

describe("Timing utilities", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("delay() waits before emitting", async () => {
    const slice = createSlice({ count: 0 });
    const mutator = (d: any) => {
      d.count++;
    };

    delay(slice, "inc" as any, 100, mutator);
    expect(slice.getState().count).toBe(0);

    vi.advanceTimersByTime(100);
    await vi.runAllTicks();
    expect(slice.getState().count).toBe(1);
  });

  it("debounce() only emits after quiet period", async () => {
    const slice = createSlice({ count: 0 });
    const mutator = (d: any) => {
      d.count++;
    };

    const debounced = debounce(slice, "inc" as any, 100, mutator);

    debounced();
    debounced();
    debounced();

    expect(slice.getState().count).toBe(0);

    vi.advanceTimersByTime(100);
    await vi.runAllTicks();
    expect(slice.getState().count).toBe(1);
  });

  it("throttle() limits emission frequency", async () => {
    const slice = createSlice({ count: 0 });
    const mutator = (d: any) => {
      d.count++;
    };

    const throttled = throttle(slice, "inc" as any, 100, mutator);

    throttled();
    expect(slice.getState().count).toBe(1); // leading

    throttled(); // ignored
    vi.advanceTimersByTime(50);
    expect(slice.getState().count).toBe(1);

    vi.advanceTimersByTime(60);
    throttled(); // allowed
    expect(slice.getState().count).toBe(2);
  });

  it("defer() executes in next available frame/tick", async () => {
    const slice = createSlice({ count: 0 });
    defer(slice, "inc" as any, (d: any) => {
      d.count++;
    });

    expect(slice.getState().count).toBe(0);

    // Defer uses rAF or setTimeout(0)
    vi.advanceTimersByTime(16); // roughly one frame
    await vi.runAllTicks();
    expect(slice.getState().count).toBe(1);
  });

  it("idle() executes during idle period", async () => {
    const slice = createSlice({ count: 0 });
    // Simulate requestIdleCallback
    const ric = vi.fn((cb) =>
      setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 10 }), 1),
    );
    vi.stubGlobal("requestIdleCallback", ric);

    idle(slice, "inc" as any, (d: any) => {
      d.count++;
    });

    expect(slice.getState().count).toBe(0);
    vi.advanceTimersByTime(1);
    await vi.runAllTicks();
    expect(slice.getState().count).toBe(1);

    vi.unstubAllGlobals();
  });
  it("delay() can be cancelled", async () => {
    const slice = createSlice({ count: 0 });
    const mutator = (d: any) => {
      d.count++;
    };

    const { cancel } = delay(slice, "inc" as any, 100, mutator);
    cancel();

    vi.advanceTimersByTime(100);
    expect(slice.getState().count).toBe(0);
  });

  it("defer() falls back to setTimeout when rAF is missing", async () => {
    vi.useRealTimers();
    const slice = createSlice({ count: 0 });
    const originalRAF = globalThis.requestAnimationFrame;
    (globalThis as any).requestAnimationFrame = undefined;

    defer(slice, "test" as any, (d) => {
      d.count++;
    });

    await new Promise((r) => setTimeout(r, 10));
    expect(slice.getState().count).toBe(1);

    globalThis.requestAnimationFrame = originalRAF;
  });

  it("idle() falls back to setTimeout when rIC is missing", async () => {
    vi.useRealTimers();
    const slice = createSlice({ count: 0 });
    const originalRIC = (globalThis as any).requestIdleCallback;
    (globalThis as any).requestIdleCallback = undefined;

    idle(slice, "test" as any, (d) => {
      d.count++;
    });

    await new Promise((r) => setTimeout(r, 10));
    expect(slice.getState().count).toBe(1);

    (globalThis as any).requestIdleCallback = originalRIC;
  });
});
