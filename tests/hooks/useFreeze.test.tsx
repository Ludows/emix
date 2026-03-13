import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createSlice } from "../../src/core/createSlice";
import { useFreeze } from "../../src/hooks/useFreeze";

describe("useFreeze()", () => {
  it("returns [false, freeze, unfreeze] initially", () => {
    const slice = createSlice({ count: 0 });
    const { result } = renderHook(() => useFreeze(slice));
    const [isFrozen] = result.current;
    expect(isFrozen).toBe(false);
  });

  it("sets isFrozen true after freeze()", () => {
    const slice = createSlice({ count: 0 });
    const { result } = renderHook(() => useFreeze(slice));

    act(() => {
      result.current[1](); // freezeFn
    });

    expect(result.current[0]).toBe(true);
  });

  it("queues emit() calls while frozen", async () => {
    const slice = createSlice({ count: 0 });
    const { result } = renderHook(() => useFreeze(slice));

    act(() => {
      result.current[1](); // freezeFn
    });

    // Fire emission while frozen
    const emitPromise = slice.emit("increment", (draft) => {
      draft.count++;
    });

    expect(slice.getState().count).toBe(0);

    // Unfreeze using the LATEST result.current[2]
    await act(async () => {
      result.current[2](); // unfreezeFn
    });

    // Wait for the state to update
    await waitFor(() => {
      expect(slice.getState().count).toBe(1);
    });

    await emitPromise;
  });
});
