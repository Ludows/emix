import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createSlice } from "../../src/core/createSlice";
import { useUndo } from "../../src/hooks/useUndo";

describe("useUndo()", () => {
  it("starts with canUndo=false and canRedo=false", () => {
    const slice = createSlice({ count: 0 });
    const { result } = renderHook(() => useUndo(slice));

    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it("sets canUndo=true after a mutation", async () => {
    const slice = createSlice({ count: 0 });
    const { result } = renderHook(() => useUndo(slice));

    await act(async () => {
      await slice.emit("increment", (draft) => {
        draft.count++;
      });
    });

    await waitFor(() => {
      expect(result.current.canUndo).toBe(true);
    });
  });

  it("undo restores the previous state", async () => {
    const slice = createSlice({ count: 0 });
    const { result } = renderHook(() => useUndo(slice));

    await act(async () => {
      await slice.emit("increment", (draft) => {
        draft.count++;
      });
    });

    await waitFor(() => {
      expect(result.current.canUndo).toBe(true);
    });

    await act(async () => {
      result.current.undo();
    });

    await waitFor(() => {
      expect(slice.getState().count).toBe(0);
    });
  });

  it("sets canRedo=true after undo", async () => {
    const slice = createSlice({ count: 0 });
    const { result } = renderHook(() => useUndo(slice));

    await act(async () => {
      await slice.emit("increment", (draft) => {
        draft.count++;
      });
    });

    await waitFor(() => expect(result.current.canUndo).toBe(true));

    await act(async () => {
      result.current.undo();
    });

    await waitFor(() => {
      expect(result.current.canRedo).toBe(true);
    });
  });

  it("redo restores the state after undo", async () => {
    const slice = createSlice({ count: 0 });
    const { result } = renderHook(() => useUndo(slice));

    await act(async () => {
      await slice.emit("increment", (draft) => {
        draft.count++;
      });
    });

    await waitFor(() => expect(result.current.canUndo).toBe(true));

    await act(async () => {
      result.current.undo();
    });

    await waitFor(() => expect(slice.getState().count).toBe(0));

    await act(async () => {
      result.current.redo();
    });

    await waitFor(() => {
      expect(slice.getState().count).toBe(1);
    });
  });

  it("sets canRedo=false after a new mutation post-undo", async () => {
    const slice = createSlice({ count: 0 });
    const { result } = renderHook(() => useUndo(slice));

    await act(async () => {
      await slice.emit("increment", (draft) => {
        draft.count++;
      });
    });

    await waitFor(() => expect(result.current.canUndo).toBe(true));

    await act(async () => {
      result.current.undo();
    });

    await waitFor(() => expect(result.current.canRedo).toBe(true));

    // New mutation clears the redo queue.
    await act(async () => {
      await slice.emit("increment", (draft) => {
        draft.count += 10;
      });
    });

    await waitFor(() => {
      expect(result.current.canRedo).toBe(false);
    });
  });

  it("cleans up subscription on unmount without throwing", () => {
    const slice = createSlice({ count: 0 });
    const { unmount } = renderHook(() => useUndo(slice));
    expect(() => unmount()).not.toThrow();
  });
});
