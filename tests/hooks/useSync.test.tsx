import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createSlice } from "../../src/core/createSlice";
import { useSync } from "../../src/hooks/useSync";

describe("useSync()", () => {
  it("returns current state of multiple slices", () => {
    const s1 = createSlice({ a: 1 });
    const s2 = createSlice({ b: 2 });

    const { result } = renderHook(() => useSync(s1, s2));
    expect(result.current).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it("re-renders when any slice changes", async () => {
    const s1 = createSlice({ a: 1 });
    const s2 = createSlice({ b: 2 });

    const { result } = renderHook(() => useSync(s1, s2));

    await act(async () => {
      await s1.emit("inc", (draft) => {
        draft.a++;
      });
    });

    expect(result.current[0]).toEqual({ a: 2 });

    await act(async () => {
      await s2.emit("inc", (draft) => {
        draft.b++;
      });
    });

    expect(result.current[1]).toEqual({ b: 3 });
  });
});
