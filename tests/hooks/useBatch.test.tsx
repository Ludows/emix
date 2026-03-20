import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useBatch } from "../../src/hooks/useBatch";

describe("useBatch()", () => {
  it("returns a stable function reference across re-renders", () => {
    const { result, rerender } = renderHook(() => useBatch());

    const firstRef = result.current;
    rerender();
    const secondRef = result.current;

    expect(firstRef).toBe(secondRef);
  });

  it("executes the provided callback when called", () => {
    const { result } = renderHook(() => useBatch());
    const callback = vi.fn();

    act(() => {
      result.current(callback);
    });

    expect(callback).toHaveBeenCalledOnce();
  });

  it("executes callbacks with the correct side effects", () => {
    const { result } = renderHook(() => useBatch());
    const log: number[] = [];

    act(() => {
      result.current(() => {
        log.push(1);
        log.push(2);
      });
    });

    expect(log).toEqual([1, 2]);
  });

  it("returned function is callable multiple times", () => {
    const { result } = renderHook(() => useBatch());
    const callback = vi.fn();

    act(() => {
      result.current(callback);
      result.current(callback);
    });

    expect(callback).toHaveBeenCalledTimes(2);
  });
});
