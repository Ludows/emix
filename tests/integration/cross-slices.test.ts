import { describe, expect, it, vi } from "vitest";
import {
  createDerivedSlice,
  createSlice,
  createStore,
} from "../../src/core/index";

describe("Cross-slice events and DerivedSlice", () => {
  it("multiple slices can react to same global event", async () => {
    const auth = createSlice({ user: null as string | null });
    const cart = createSlice({ items: [] as string[] });
    const ui = createSlice({ theme: "light" });

    const store = createStore({ auth, cart, ui });

    const clearCart = vi.fn();
    store.on("auth/logout", () => {
      cart.emit("clear" as any, clearCart);
    });

    const uiReset = vi.fn();
    store.on("auth/logout", () => {
      ui.emit("reset" as any, uiReset);
    });

    await auth.emit("logout", (draft) => {
      draft.user = null;
    });

    expect(clearCart).toHaveBeenCalled();
    expect(uiReset).toHaveBeenCalled();
  });

  it("slice events bubble to global store", async () => {
    const auth = createSlice({ user: null as string | null });
    const store = createStore({ auth });

    const globalListener = vi.fn();
    store.on("auth/login", globalListener);

    await auth.emit("login", (draft) => {
      draft.user = "John";
    });

    expect(globalListener).toHaveBeenCalled();
    const [state, nextState, diff] = globalListener.mock.calls[0];
    expect(nextState.auth.user).toBe("John");
  });

  it("DerivedSlice computes value from dependencies and is read-only", () => {
    const cart = createSlice({ items: [1, 2, 3] });
    const discounts = createSlice({ total: 5 });

    const summary = createDerivedSlice([cart, discounts], (c, d) => {
      return { total: c.items.length * 10 - d.total };
    });

    const store = createStore({ cart, discounts, summary });

    expect(summary.getState().total).toBe(25);

    expect(() => (summary as any).emit("update", () => {})).toThrow(
      "read-only",
    );

    // cart update should trigger recompute via react hooks manually here we just check current state
    cart.emit("add", (draft) => {
      draft.items.push(4);
    });
    expect(summary.getState().total).toBe(35);
  });
});
