import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createSlice } from "../../src/core/createSlice";
import { useEmit } from "../../src/hooks/useEmit";

describe("useEmit()", () => {
  it("provides an emit function linked to the slice", async () => {
    const slice = createSlice({ count: 0 });
    const { result } = renderHook(() => useEmit(slice));

    await result.current("inc" as any, (d: any) => {
      d.count++;
    });

    expect(slice.getState().count).toBe(1);
  });
});
