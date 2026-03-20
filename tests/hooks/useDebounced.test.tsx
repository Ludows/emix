import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSlice } from "../../src/core/createSlice";
import { useDebounced } from "../../src/hooks/useDebounced";

describe("useDebounced()", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the initial selected value immediately (no delay)", () => {
    const slice = createSlice({ count: 5 });
    const { result } = renderHook(() =>
      useDebounced(slice, (s) => s.count, 300),
    );

    expect(result.current).toBe(5);
  });

  it("does not update the state before the delay elapses", async () => {
    const slice = createSlice({ count: 0 });
    const { result } = renderHook(() =>
      useDebounced(slice, (s) => s.count, 300),
    );

    await act(async () => {
      await slice.emit("increment", (draft) => {
        draft.count++;
      });
    });

    // Still 0 because 300 ms have not elapsed yet.
    expect(result.current).toBe(0);
  });

  it("updates the state after the delay elapses", async () => {
    const slice = createSlice({ count: 0 });
    const { result } = renderHook(() =>
      useDebounced(slice, (s) => s.count, 300),
    );

    await act(async () => {
      await slice.emit("increment", (draft) => {
        draft.count++;
      });
    });

    // Advance timers past the debounce window.
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe(1);
  });

  it("resets the debounce window on rapid successive changes", async () => {
    const slice = createSlice({ count: 0 });
    const { result } = renderHook(() =>
      useDebounced(slice, (s) => s.count, 300),
    );

    await act(async () => {
      await slice.emit("inc", (draft) => { draft.count++; });
    });

    // Advance only 200 ms — timer not yet fired.
    act(() => { vi.advanceTimersByTime(200); });
    expect(result.current).toBe(0);

    await act(async () => {
      await slice.emit("inc", (draft) => { draft.count++; });
    });

    // 200 ms more — 400 ms total since first emit, but only 200 ms since second.
    act(() => { vi.advanceTimersByTime(200); });
    expect(result.current).toBe(0);

    // Final 100 ms — debounce window from second emit (300 ms) has now passed.
    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current).toBe(2);
  });

  it("cleans up the debounce timer on unmount", async () => {
    const slice = createSlice({ count: 0 });
    const { result, unmount } = renderHook(() =>
      useDebounced(slice, (s) => s.count, 300),
    );

    await act(async () => {
      await slice.emit("increment", (draft) => {
        draft.count++;
      });
    });

    // Unmount before the timer fires.
    unmount();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Result was snapshotted at unmount time — still 0.
    expect(result.current).toBe(0);
  });
});
