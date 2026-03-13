import { describe, expect, it } from "vitest";
import { createSlice } from "../../../src/core/createSlice";
import {
  history,
  recordHistory,
  redo,
  replayTo,
  undo,
} from "../../../src/utils/history";

describe("History utilities", () => {
  it("history() records changes when enabled", async () => {
    const slice = createSlice({ count: 0 });
    recordHistory(slice, { limit: 10 });

    await slice.emit("inc", (d) => {
      d.count++;
    });
    await slice.emit("inc", (d) => {
      d.count++;
    });

    expect(history(slice).length).toBe(2);
    expect((history(slice)[1] as any).nextState.count).toBe(2);
  });

  it("undo() and redo() work correctly", async () => {
    const slice = createSlice({ count: 0 });
    recordHistory(slice);

    await slice.emit("set", (d) => {
      d.count = 1;
    });
    await slice.emit("set", (d) => {
      d.count = 2;
    });

    expect(slice.getState().count).toBe(2);

    await undo(slice);
    expect(slice.getState().count).toBe(1);

    await undo(slice);
    expect(slice.getState().count).toBe(0);

    await redo(slice);
    expect(slice.getState().count).toBe(1);
  });

  it("replayTo() jumps to specific entry", async () => {
    const slice = createSlice({ count: 0 });
    recordHistory(slice);

    await slice.emit("set", (d) => {
      d.count = 1;
    });
    await slice.emit("set", (d) => {
      d.count = 2;
    });

    const entries = history(slice);
    await replayTo(slice, entries[0]!.id); // count: 1
    expect(slice.getState().count).toBe(1);
  });

  it("recordHistory honors limit", async () => {
    const slice = createSlice({ count: 0 });
    recordHistory(slice, { limit: 1 });

    await slice.emit("set", (d: any) => {
      d.count = 1;
    });
    await slice.emit("set", (d: any) => {
      d.count = 2;
    });

    const entries = history(slice);
    expect(entries.length).toBe(1);
    expect((entries[0]!.nextState as any).count).toBe(2);
  });

  it("handles empty/missing history and redo queue", async () => {
    const slice = createSlice({ count: 0 });
    undo(slice);
    redo(slice);
    replayTo(slice, "none");
    expect(slice.getState().count).toBe(0);

    recordHistory(slice);

    // Using an empty string as event name triggers the "unknown" fallback in history.ts
    // because "" is falsy.
    await slice.emit("" as any, (d: any) => {
      d.count = 1;
    });

    const h = history(slice);
    expect(h.length).toBe(1);
    expect(h[0]!.event).toBe("unknown");
  });
});
