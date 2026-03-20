import { describe, expect, it, vi } from "vitest";
import {
  createDerivedSlice,
  createScopedStore,
  createSlice,
  createStore,
} from "../../../src/core";

describe("Core Store functions", () => {
  it("createStore() handles multiple slices and global state", () => {
    const s1 = createSlice({ a: 1 });
    const s2 = createSlice({ b: 2 });
    const store = createStore({ s1, s2 });

    expect(store.getState()).toEqual({ s1: { a: 1 }, s2: { b: 2 } });
  });

  it("createStore() throws if slice is not found in emit", () => {
    const store = createStore({ s1: createSlice({ a: 1 }) });
    expect(() => store.emit("invalid/event", () => {})).toThrow(
      '[emix] Store: slice "invalid" not found',
    );
  });

  it("createDerivedSlice() computes value and updates when dependencies change", async () => {
    const s1 = createSlice({ val: 10 });
    const derived = createDerivedSlice([s1], (state1) => state1.val * 2);

    expect(derived.getState()).toBe(20);

    await s1.emit("set", (d) => {
      d.val = 5;
    });
    expect(derived.getState()).toBe(10);
  });

  it("createDerivedSlice() is reactive via on()", async () => {
    const s1 = createSlice({ val: 10 });
    const derived = createDerivedSlice([s1], (state1) => state1.val * 2);
    const handler = vi.fn();

    derived.on(undefined as any, handler);

    await s1.emit("set", (d) => {
      d.val = 5;
    });

    expect(handler).toHaveBeenCalled();
    expect(handler.mock.calls[0][1]).toBe(10); // next state of derived
  });

  it("createScopedStore() is exactly like createSlice", () => {
    const scoped = createScopedStore({ x: 1 });
    expect(scoped.getState()).toEqual({ x: 1 });
    scoped.emit("test", (d) => {
      d.x = 2;
    });
    expect(scoped.getState().x).toBe(2);
  });

  it("createStore() on() listens to slice events with bubbling", async () => {
    const s1 = createSlice({ a: 1 });
    const store = createStore({ s1 });
    const listener = vi.fn();

    store.on("s1/test", listener);
    await s1.emit("test", () => {});

    expect(listener).toHaveBeenCalled();
  });

  it("createDerivedSlice.once() works and unsubscribes", async () => {
    const s1 = createSlice({ val: 10 });
    const derived = createDerivedSlice([s1], (st: any) => st.val * 2);
    const handler = vi.fn();

    derived.once("test", handler);

    await s1.emit("test", (d: any) => {
      d.val = 5;
    });
    await s1.emit("test", (d: any) => {
      d.val = 2;
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });
});
