import { describe, expect, it, vi } from "vitest";
import { createSlice } from "../../../src/core/createSlice";
import { cloneSlice } from "../../../src/utils/cloneSlice";

describe("cloneSlice utility", () => {
  it("clone has the same state as the source", () => {
    const source = createSlice({ count: 5, name: "hello" });
    const clone = cloneSlice(source);

    expect(clone.getState()).toEqual({ count: 5, name: "hello" });
  });

  it("mutating the clone does not affect the source", async () => {
    const source = createSlice({ count: 5 });
    const clone = cloneSlice(source);

    await clone.emit("inc" as any, (d: any) => {
      d.count = 99;
    });

    expect(clone.getState().count).toBe(99);
    expect(source.getState().count).toBe(5);
  });

  it("mutating the source does not affect the clone", async () => {
    const source = createSlice({ count: 5 });
    const clone = cloneSlice(source);

    await source.emit("inc" as any, (d: any) => {
      d.count = 99;
    });

    expect(source.getState().count).toBe(99);
    expect(clone.getState().count).toBe(5);
  });

  it("override is applied on the clone", () => {
    const source = createSlice({ count: 5, name: "original" });
    const clone = cloneSlice(source, { name: "overridden" });

    expect(clone.getState().name).toBe("overridden");
    expect(clone.getState().count).toBe(5);
    // Source is not affected by the override
    expect(source.getState().name).toBe("original");
  });

  it("listeners are not shared between source and clone", async () => {
    const source = createSlice({ count: 0 });
    const clone = cloneSlice(source);

    const sourceListener = vi.fn();
    const cloneListener = vi.fn();

    source.on("update" as any, sourceListener);
    clone.on("update" as any, cloneListener);

    await source.emit("update" as any, (d: any) => {
      d.count = 1;
    });

    // Only the source listener should have fired
    expect(sourceListener).toHaveBeenCalledTimes(1);
    expect(cloneListener).not.toHaveBeenCalled();

    await clone.emit("update" as any, (d: any) => {
      d.count = 2;
    });

    // Now only the clone listener should have fired
    expect(cloneListener).toHaveBeenCalledTimes(1);
    expect(sourceListener).toHaveBeenCalledTimes(1);
  });
});
