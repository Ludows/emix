import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createSlice } from "../../src/core/createSlice";
import { useAsyncEmit } from "../../src/hooks/useAsyncEmit";

describe("useAsyncEmit()", () => {
  it("initial status is idle", () => {
    const slice = createSlice({ count: 0 });
    const { result } = renderHook(() => useAsyncEmit(slice, "test"));
    const [status] = result.current;
    expect(status.isPending).toBe(false);
    expect(status.isSuccess).toBe(false);
  });

  it("sets isPending true during async mutation", async () => {
    const slice = createSlice({ count: 0 });
    const { result } = renderHook(() => useAsyncEmit(slice, "test"));
    const [, emit] = result.current;

    let resolveMutation: (v: void) => void;
    const promise = new Promise<void>((resolve) => {
      resolveMutation = resolve;
    });

    let emitPromise: Promise<void>;
    await act(async () => {
      emitPromise = emit(async (draft) => {
        await promise;
        draft.count++;
      });
    });

    expect(result.current[0].isPending).toBe(true);

    await act(async () => {
      resolveMutation!();
    });

    await emitPromise!;
    expect(result.current[0].isPending).toBe(false);
    expect(result.current[0].isSuccess).toBe(true);
  });

  it("sets isError true on failure", async () => {
    const slice = createSlice({ count: 0 });
    const { result } = renderHook(() => useAsyncEmit(slice, "test"));
    const [, emit] = result.current;

    await act(async () => {
      try {
        await emit(async () => {
          throw new Error("Async error");
        });
      } catch (e) {
        // expected
      }
    });

    expect(result.current[0].isError).toBe(true);
    expect(result.current[0].error?.message).toBe("Async error");
  });
});
