import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createSlice } from "../../src/core/createSlice";
import { useAsyncEmit } from "../../src/hooks/useAsyncEmit";

describe("useAsyncEmit() edge cases", () => {
  it("does not update status if unmounted during async mutation", async () => {
    const slice = createSlice({ count: 0 });
    const { result, unmount } = renderHook(() =>
      useAsyncEmit(slice, "test" as any),
    );
    const [, mutate] = result.current;

    let resolvePromise: any;
    const promise = new Promise<void>((resolve) => {
      resolvePromise = resolve;
    });

    let mutationPromise: Promise<void>;
    await act(async () => {
      mutationPromise = mutate(async () => {
        await promise;
      });
    });

    expect(result.current[0].isPending).toBe(true);

    unmount();
    resolvePromise();
    await mutationPromise!;
  });

  it("handles sync mutations that return promise in emit", async () => {
    const slice = createSlice({ count: 0 });
    const { result } = renderHook(() => useAsyncEmit(slice, "test" as any));
    const [, mutate] = result.current;

    await act(async () => {
      await mutate(async (d) => {
        d.count = 5;
      });
    });

    expect(result.current[0].isSuccess).toBe(true);
    expect(slice.getState().count).toBe(5);
  });
});
