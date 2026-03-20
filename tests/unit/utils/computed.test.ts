import { describe, expect, it, vi } from "vitest";
import { createSlice } from "../../../src/core/createSlice";
import { computed } from "../../../src/utils/computed";

describe("computed utility", () => {
  it("has the correct initial value", () => {
    const a = createSlice({ x: 2 });
    const b = createSlice({ y: 3 });

    const sum = computed([a, b], (sa, sb) => sa.x + sb.y);

    expect(sum.getState()).toBe(5);
  });

  it("updates when a dependency changes", async () => {
    const a = createSlice({ x: 2 });
    const b = createSlice({ y: 3 });

    const sum = computed([a, b], (sa, sb) => sa.x + sb.y);

    await a.emit("set" as any, (d: any) => {
      d.x = 10;
    });

    expect(sum.getState()).toBe(13); // 10 + 3
  });

  it("notifies subscribers when the computed value changes", async () => {
    const a = createSlice({ x: 1 });
    const derived = computed([a], (sa) => sa.x * 2);
    const handler = vi.fn();

    derived.on(undefined as any, handler);

    await a.emit("set" as any, (d: any) => {
      d.x = 5;
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(derived.getState()).toBe(10);
  });

  it("equals option prevents notification when value is unchanged", async () => {
    const a = createSlice({ items: [1, 2, 3] });
    const handler = vi.fn();

    // Selector always returns the same length; equals compares by value
    const lengthSlice = computed(
      [a],
      (sa) => sa.items.length,
      { equals: (prev, next) => prev === next },
    );

    lengthSlice.on(undefined as any, handler);

    // Mutate items but keep the same length
    await a.emit("swap" as any, (d: any) => {
      d.items = [4, 5, 6];
    });

    // Length is still 3 → equals returns true → no notification
    expect(handler).not.toHaveBeenCalled();
    expect(lengthSlice.getState()).toBe(3);
  });

  it("equals option fires notification when value changes", async () => {
    const a = createSlice({ items: [1, 2, 3] });
    const handler = vi.fn();

    const lengthSlice = computed(
      [a],
      (sa) => sa.items.length,
      { equals: (prev, next) => prev === next },
    );

    lengthSlice.on(undefined as any, handler);

    await a.emit("push" as any, (d: any) => {
      d.items = [1, 2, 3, 4];
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(lengthSlice.getState()).toBe(4);
  });

  it("emit throws a read-only error", () => {
    const a = createSlice({ x: 1 });
    const derived = computed([a], (sa) => sa.x);

    expect(() => derived.emit(undefined as any, () => {})).toThrow(
      "[emix] computed: computed slices are read-only and cannot emit events.",
    );
  });
});
