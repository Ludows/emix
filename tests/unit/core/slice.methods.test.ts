import { describe, expect, it, vi } from "vitest";
import { createSlice } from "../../../src/core";

describe("Slice.reset()", () => {
  it("resets state to initial after mutation", async () => {
    const slice = createSlice({ count: 0, name: "alice" });

    await slice.emit("increment", (d) => {
      d.count = 42;
      d.name = "bob";
    });

    expect(slice.getState()).toEqual({ count: 42, name: "bob" });

    await slice.reset();

    expect(slice.getState()).toEqual({ count: 0, name: "alice" });
  });

  it("stored initial state is a deep clone, not a reference", async () => {
    const initial = { nested: { value: 1 } };
    const slice = createSlice(initial);

    // Mutate the original object after creation — reset must still return
    // the state captured at slice creation time.
    initial.nested.value = 999;

    await slice.emit("change", (d) => {
      d.nested.value = 42;
    });

    await slice.reset();

    expect(slice.getState().nested.value).toBe(1);
  });

  it("reset() emits a $reset event that listeners can observe", async () => {
    const slice = createSlice({ x: 10 });
    const handler = vi.fn();

    slice.on("$reset", handler);

    await slice.emit("change", (d) => {
      d.x = 99;
    });
    await slice.reset();

    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe("Slice.offAll()", () => {
  it("offAll() with no argument removes all listeners — they are not called after", async () => {
    const slice = createSlice({ x: 0 });
    const handlerA = vi.fn();
    const handlerB = vi.fn();

    slice.on("change", handlerA);
    slice.on("other", handlerB);

    slice.offAll();

    await slice.emit("change", (d) => {
      d.x = 1;
    });
    await slice.emit("other", (d) => {
      d.x = 2;
    });

    expect(handlerA).not.toHaveBeenCalled();
    expect(handlerB).not.toHaveBeenCalled();
  });

  it("offAll(event) removes only listeners for that specific event", async () => {
    const slice = createSlice({ x: 0 });
    const handlerA = vi.fn();
    const handlerB = vi.fn();

    slice.on("remove-me", handlerA);
    slice.on("keep-me", handlerB);

    slice.offAll("remove-me");

    await slice.emit("remove-me", (d) => {
      d.x = 1;
    });
    await slice.emit("keep-me", (d) => {
      d.x = 2;
    });

    expect(handlerA).not.toHaveBeenCalled();
    expect(handlerB).toHaveBeenCalledTimes(1);
  });

  it("offAll() on an event with no listeners does not throw", () => {
    const slice = createSlice({ x: 0 });
    expect(() => slice.offAll("nonexistent")).not.toThrow();
  });
});
