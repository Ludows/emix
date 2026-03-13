import { describe, expect, it, vi } from "vitest";
import { createSlice } from "../../../src/core/createSlice";
import { fill, forget, freeze, merge, reset } from "../../../src/utils/state";

describe("State utilities", () => {
  it("fill() replaces state with data", () => {
    const slice = createSlice({ a: 1, b: 2 });
    fill(slice, { a: 10 });
    expect(slice.getState()).toEqual({ a: 10, b: 2 });
  });

  it("reset() restores initial state", async () => {
    const slice = createSlice({ count: 0 });
    // First call to reset captures initial state IF not already done
    reset(slice);

    await slice.emit("inc", (d) => {
      d.count = 5;
    });
    expect(slice.getState().count).toBe(5);

    reset(slice);
    expect(slice.getState().count).toBe(0);
  });

  it("merge() deep merges objects", () => {
    const slice = createSlice({
      user: { name: "A", details: { city: "Paris" } },
    });
    merge(slice, { user: { details: { city: "Lyon" } } } as any);
    expect(slice.getState().user.details.city).toBe("Lyon");
    expect(slice.getState().user.name).toBe("A");
  });

  it("forget() clears all listeners", async () => {
    const slice = createSlice({ count: 0 });
    const listener = vi.fn();
    slice.on("test" as any, listener);

    forget(slice);

    await slice.emit("test" as any, () => {});
    expect(listener).not.toHaveBeenCalled();
  });

  // freeze() is tested in hooks/useFreeze.test.tsx and partially in its skip.
  it("freeze() blocks and replays emissions", async () => {
    const slice = createSlice({ count: 0 });
    const { unfreeze } = freeze(slice);

    const promise = slice.emit("inc" as any, (d: any) => {
      d.count++;
    });
    expect(slice.getState().count).toBe(0);

    unfreeze();
    await promise;
    expect(slice.getState().count).toBe(1);
  });
  it("merge() handles primitive overrides", async () => {
    const slice = createSlice({ val: 1 } as any);
    merge(slice, { val: { a: 1 } } as any);
    expect(slice.getState().val).toEqual({ a: 1 });

    merge(slice, { val: 2 } as any);
    expect(slice.getState().val).toBe(2);
  });

  it("freeze() returns existing unfreeze if already frozen", () => {
    const slice = createSlice({ count: 0 });
    const f1 = freeze(slice);
    const f2 = freeze(slice);
    expect(f1).toBe(f2);
    f1.unfreeze();
  });
});
