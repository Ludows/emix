import { describe, expect, it, vi } from "vitest";
import { createSlice, createStore } from "../../../src/core";

describe("Store.transaction()", () => {
  it("mutations performed inside fn are visible after transaction resolves", async () => {
    const counter = createSlice({ count: 0 });
    const store = createStore({ counter });

    await store.transaction(async (slices) => {
      await slices.counter.emit("inc", (d) => {
        d.count = 5;
      });
    });

    expect(store.getState().counter.count).toBe(5);
  });

  it("unfreezes slices even when fn throws", async () => {
    const counter = createSlice({ count: 0 });
    const store = createStore({ counter });

    await expect(
      store.transaction(async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    // After the failed transaction the slice should be usable again.
    await counter.emit("inc", (d) => {
      d.count = 99;
    });
    expect(counter.getState().count).toBe(99);
  });

  it("emissions queued during freeze are processed after unfreeze", async () => {
    const counter = createSlice({ count: 0 });
    const store = createStore({ counter });

    // Start a transaction that takes a moment to complete.
    const txDone = store.transaction(async (slices) => {
      // Small async gap so the queued emit below is registered while frozen.
      await Promise.resolve();
      await slices.counter.emit("tx-inc", (d) => {
        d.count += 10;
      });
    });

    // This emit is queued because the slice is frozen during the transaction.
    const queuedEmit = counter.emit("queued-inc", (d) => {
      d.count += 1;
    });

    await txDone;
    await queuedEmit;

    // Both mutations must have been applied.
    expect(counter.getState().count).toBe(11);
  });
});

describe("Store.emitBatch()", () => {
  it("emits events on multiple slices sequentially", async () => {
    const order: string[] = [];

    const a = createSlice({ val: 0 });
    const b = createSlice({ val: 0 });

    a.on("set", () => { order.push("a"); });
    b.on("set", () => { order.push("b"); });

    const store = createStore({ a, b });

    await store.emitBatch([
      { slice: "a", event: "set", mutator: (d) => { d.val = 1; } },
      { slice: "b", event: "set", mutator: (d) => { d.val = 2; } },
    ]);

    expect(store.getState()).toEqual({ a: { val: 1 }, b: { val: 2 } });
    expect(order).toEqual(["a", "b"]);
  });

  it("throws a descriptive error when a slice name is unknown", async () => {
    const store = createStore({ a: createSlice({ val: 0 }) });

    await expect(
      store.emitBatch([
        { slice: "unknown", event: "set", mutator: () => {} },
      ]),
    ).rejects.toThrow('[emix] Store.emitBatch: slice "unknown" not found');
  });

  it("stops at the first error and does not emit subsequent events", async () => {
    const handler = vi.fn();
    const b = createSlice({ val: 0 });
    b.on("set", handler);

    const store = createStore({ b });

    await expect(
      store.emitBatch([
        { slice: "missing", event: "set", mutator: () => {} },
        { slice: "b", event: "set", mutator: () => {} },
      ]),
    ).rejects.toThrow();

    expect(handler).not.toHaveBeenCalled();
  });
});
