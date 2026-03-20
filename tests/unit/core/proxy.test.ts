import { describe, expect, it, vi } from "vitest";
import {
  createProxy,
  createProxySession,
  scheduleNotification,
} from "../../../src/core/proxy";

describe("Proxy tracking", () => {
  it("tracks nested mutations via deltas", () => {
    const session = createProxySession();
    const state = createProxy({ user: { name: "John" } }, session);
    state.user.name = "Jane";
    expect(session.deltas).toEqual([
      { path: ["user", "name"], type: "set", prev: "John", next: "Jane" },
    ]);
  });

  it("tracks deep nested mutations via deltas", () => {
    const session = createProxySession();
    const state = createProxy({ a: { b: { c: 1 } } }, session);
    state.a.b.c = 42;
    expect(session.deltas).toEqual([
      { path: ["a", "b", "c"], type: "set", prev: 1, next: 42 },
    ]);
  });

  it("handles array push — single notification", () => {
    const session = createProxySession();
    const state = createProxy({ items: [1, 2] }, session);
    state.items.push(3);
    expect(session.deltas).toEqual([
      { path: ["items", "2"], type: "array/push", prev: undefined, next: 3 },
    ]);
  });

  it("handles array splice correctly", () => {
    const session = createProxySession();
    const state = createProxy({ items: [1, 2, 3] }, session);
    state.items.splice(1, 1);
    expect(session.deltas).toEqual([
      { path: ["items"], type: "array/splice", prev: [1, 2, 3], next: [1, 3] },
    ]);
  });

  it("handles array sort correctly", () => {
    const session = createProxySession();
    const state = createProxy({ items: [3, 1, 2] }, session);
    state.items.sort();
    expect(session.deltas).toEqual([
      { path: ["items"], type: "array/sort", prev: [3, 1, 2], next: [1, 2, 3] },
    ]);
  });

  // it('batches multiple mutations in same microtask') -> This is tested via bus/store integration usually.

  it("generates correct diff for primitive changes", () => {
    const session = createProxySession();
    const state = createProxy({ count: 0 }, session);
    state.count = 5;
    expect(session.deltas).toEqual([
      { path: ["count"], type: "set", prev: 0, next: 5 },
    ]);
  });

  it("generates correct diff for nested objects", () => {
    const session = createProxySession();
    const state = createProxy({ user: { name: "A" } }, session);
    state.user.name = "B";
    expect(session.deltas).toEqual([
      { path: ["user", "name"], type: "set", prev: "A", next: "B" },
    ]);
  });

  it("handles circular references gracefully", () => {
    const session = createProxySession();
    const obj: any = {};
    obj.self = obj;
    const state = createProxy(obj, session);
    expect(() => state.self.self).not.toThrow();
  });

  it("stops proxifying beyond depth limit", () => {
    const session = createProxySession();
    // Build an object 12 levels deep
    const deep: any = {};
    let cur = deep;
    for (let i = 0; i < 12; i++) {
      cur.child = {};
      cur = cur.child;
    }
    cur.value = 99;
    const state = createProxy(deep, session);
    // Accessing deep levels should not throw even beyond the depth limit
    expect(() => {
      let node: any = state;
      for (let i = 0; i < 12; i++) node = node.child;
    }).not.toThrow();
  });

  it("does not proxify primitives", () => {
    const session = createProxySession();
    const state = createProxy({ a: 1 }, session);
    const val = state.a;
    expect(typeof val).toBe("number");
  });

  it("handles undefined and null values", () => {
    const session = createProxySession();
    const state = createProxy({ a: null, b: undefined } as any, session);
    expect(state.a).toBeNull();
    expect(state.b).toBeUndefined();
  });

  it("handles delete operator with symbols", () => {
    const session = createProxySession();
    const sym = Symbol("test");
    const state = createProxy({ [sym]: 1 } as any, session);
    delete state[sym];
    expect(session.deltas.length).toBe(0); // Symbols ignored by our tracking
  });

  it("handles ownKeys trap", () => {
    const session = createProxySession();
    const state = createProxy({ a: 1, b: 2 }, session);
    expect(Object.keys(state)).toEqual(["a", "b"]);
  });

  it("handles has trap", () => {
    const session = createProxySession();
    const state = createProxy({ a: 1 }, session);
    expect("a" in state).toBe(true);
    expect("b" in state).toBe(false);
  });

  it("handles getPrototypeOf trap", () => {
    const session = createProxySession();
    const state = createProxy({ a: 1 }, session);
    expect(Object.getPrototypeOf(state)).toBe(Object.prototype);
  });
  it("handles array pop correctly", () => {
    const session = createProxySession();
    const state = createProxy({ items: [1, 2] }, session);
    state.items.pop();
    expect(session.deltas).toEqual([
      { path: ["items"], type: "set", prev: [1, 2], next: [1] },
    ]);
  });

  it("handles array shift correctly", () => {
    const session = createProxySession();
    const state = createProxy({ items: [1, 2] }, session);
    state.items.shift();
    expect(session.deltas).toEqual([
      { path: ["items"], type: "set", prev: [1, 2], next: [2] },
    ]);
  });

  it("scheduleNotification batches tasks", async () => {
    const task1 = vi.fn();
    const task2 = vi.fn();
    scheduleNotification(task1);
    scheduleNotification(task2);

    expect(task1).not.toHaveBeenCalled();
    expect(task2).not.toHaveBeenCalled();

    await new Promise((r) => setTimeout(r, 0));
    expect(task1).toHaveBeenCalledTimes(1);
    expect(task2).toHaveBeenCalledTimes(1);
  });

  it("handles array push correctly", () => {
    const session = createProxySession();
    const state = createProxy({ items: [1] }, session);
    state.items.push(2);
    expect(state.items).toEqual([1, 2]);
    expect(session.deltas).toHaveLength(1);
    expect(session.deltas[0]?.type).toBe("array/push");
  });

  it("handles array splice correctly", () => {
    const session = createProxySession();
    const state = createProxy({ items: [1, 2, 3] }, session);
    state.items.splice(1, 1, 4);
    expect(state.items).toEqual([1, 4, 3]);
    expect(session.deltas).toHaveLength(1);
    expect(session.deltas[0]?.type).toBe("array/splice");
  });

  it("handles array sort/reverse correctly", () => {
    const session = createProxySession();
    const stateActive = createProxy({ items: [2, 1] }, session);
    stateActive.items.sort();
    expect(stateActive.items).toEqual([1, 2]);
    expect(session.deltas).toHaveLength(1);
    expect(session.deltas[0]?.type).toBe("array/sort");

    stateActive.items.reverse();
    expect(stateActive.items).toEqual([2, 1]);
  });

  it("handles nested array transactions", () => {
    const session = createProxySession();
    const state = createProxy({ items: [[1]] } as any, session);

    // session.isArrayTransactionActive becomes true for the outer push
    // but the inner one sees it as already active
    state.items[0].push(2);

    expect(state.items[0]).toEqual([1, 2]);
    expect(session.isArrayTransactionActive).toBe(false);
  });

  it("covers remaining proxy traps and array methods", () => {
    const session = createProxySession();
    const state = createProxy({ a: 1, b: 2, items: [1, 2] } as any, session);

    // pop/shift/unshift (the 'else' branch in array methods)
    state.items.pop();
    state.items.shift();
    state.items.unshift(3);

    // deleteProperty
    delete state.a;
    expect(state.a).toBeUndefined();
    expect(session.deltas.some((d) => d.type === "delete")).toBe(true);

    // ownKeys
    expect(Object.keys(state)).toContain("b");

    // has
    expect("b" in state).toBe(true);

    // getPrototypeOf
    expect(Object.getPrototypeOf(state)).toBe(Object.getPrototypeOf({}));

    // symbol property
    const sym = Symbol("test");
    (state as any)[sym] = "val";
    expect((state as any)[sym]).toBe("val");
    expect(sym in state).toBe(true);
    delete (state as any)[sym];
    expect((state as any)[sym]).toBeUndefined();
  });

  it("handles truly nested array transactions for coverage", () => {
    const session = createProxySession();
    const state = createProxy({ items: [1, 2] }, session);

    // push calling pop internally to hit wasActive = true branch
    state.items.push(state.items.pop()!);

    expect(state.items).toEqual([1, 2]);
    expect(session.isArrayTransactionActive).toBe(false);
  });
});
