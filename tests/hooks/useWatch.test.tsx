import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createSlice } from "../../src/core/createSlice";
import { useWatch } from "../../src/hooks/useWatch";

describe("useWatch()", () => {
  it("calls the callback when the watched path changes", async () => {
    const slice = createSlice({ count: 0, name: "alice" });
    const callback = vi.fn();

    renderHook(() => useWatch(slice, "count", callback));

    await act(async () => {
      await slice.emit("increment", (draft) => {
        draft.count++;
      });
    });

    expect(callback).toHaveBeenCalledOnce();
    expect(callback).toHaveBeenCalledWith(1, 0);
  });

  it("does not call the callback when an unrelated path changes", async () => {
    const slice = createSlice({ count: 0, name: "alice" });
    const callback = vi.fn();

    renderHook(() => useWatch(slice, "count", callback));

    await act(async () => {
      await slice.emit("rename", (draft) => {
        draft.name = "bob";
      });
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it("stops calling the callback after unmount (cleanup)", async () => {
    const slice = createSlice({ count: 0 });
    const callback = vi.fn();

    const { unmount } = renderHook(() => useWatch(slice, "count", callback));

    unmount();

    await act(async () => {
      await slice.emit("increment", (draft) => {
        draft.count++;
      });
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it("always invokes the latest callback reference without re-subscribing", async () => {
    const slice = createSlice({ count: 0 });
    const callbackV1 = vi.fn();
    const callbackV2 = vi.fn();
    let currentCb = callbackV1;

    const { rerender } = renderHook(() =>
      useWatch(slice, "count", currentCb),
    );

    // Switch to a new callback reference.
    currentCb = callbackV2;
    rerender();

    await act(async () => {
      await slice.emit("increment", (draft) => {
        draft.count++;
      });
    });

    expect(callbackV1).not.toHaveBeenCalled();
    expect(callbackV2).toHaveBeenCalledOnce();
  });

  it("throws for an invalid (empty) path", () => {
    const slice = createSlice({ count: 0 });

    expect(() =>
      renderHook(() => useWatch(slice, "", vi.fn())),
    ).toThrow("[emix] watch");
  });

  it("throws for a path starting with a dot", () => {
    const slice = createSlice({ count: 0 });

    expect(() =>
      renderHook(() => useWatch(slice, ".count", vi.fn())),
    ).toThrow("[emix] watch");
  });

  it("throws for a path containing consecutive dots", () => {
    const slice = createSlice({ count: 0 });

    expect(() =>
      renderHook(() => useWatch(slice, "a..b", vi.fn())),
    ).toThrow("[emix] watch");
  });
});
