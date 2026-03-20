import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createSlice } from "../../src/core/createSlice";
import { useSnapshot } from "../../src/hooks/useSnapshot";

describe("useSnapshot()", () => {
  it("returns initial selected value", () => {
    const slice = createSlice({ count: 0 });
    const { result } = renderHook(() => useSnapshot(slice, (s) => s.count));
    expect(result.current).toBe(0);
  });

  it("re-renders when selected value changes", async () => {
    const slice = createSlice({ count: 0 });
    const { result } = renderHook(() => useSnapshot(slice, (s) => s.count));

    await act(async () => {
      await slice.emit("increment", (draft) => {
        draft.count++;
      });
    });

    expect(result.current).toBe(1);
  });

  it("does NOT re-render when other state changes", async () => {
    const slice = createSlice({ count: 0, other: "foo" });
    let renderCount = 0;
    const { result } = renderHook(() => {
      renderCount++;
      return useSnapshot(slice, (s) => s.count);
    });

    expect(renderCount).toBe(1);

    await act(async () => {
      await slice.emit("updateOther", (draft) => {
        draft.other = "bar";
      });
    });

    // selector value still 0, should not re-render
    expect(renderCount).toBe(1);
    expect(result.current).toBe(0);
  });

  it("cleans up subscription on unmount", () => {
    const slice = createSlice({ count: 0 });
    const { unmount } = renderHook(() => useSnapshot(slice, (s) => s.count));

    unmount();
    // This is hard to test directly without exposing subscribers,
    // but we ensure it doesn't crash.
  });
});

describe("useSnapshot() – unsupported options", () => {
  it("throws a clear [emix] error when 'only' is provided", () => {
    const slice = createSlice({ count: 0 });

    expect(() =>
      renderHook(() =>
        useSnapshot(slice, (s) => s.count, { only: ["count"] } as any),
      ),
    ).toThrow("[emix] useSnapshot");
  });

  it("throws a clear [emix] error when 'exclude' is provided", () => {
    const slice = createSlice({ count: 0 });

    expect(() =>
      renderHook(() =>
        useSnapshot(slice, (s) => s.count, { exclude: ["count"] } as any),
      ),
    ).toThrow("[emix] useSnapshot");
  });
});
