import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createSlice } from "../../../src/core/createSlice";
import { pipe } from "../../../src/utils/observation";

// The cycle-detection state (_inFlight, _pipeDepth) in observation.ts is module-level.
// Each test creates fresh slices so the sets never carry cross-test pollution.

describe("observation – cycle detection in pipe()", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("does not loop infinitely when A→B and B→A are both piped", async () => {
    const sliceA = createSlice({ value: 0 });
    const sliceB = createSlice({ value: 0 });

    // A fires → mutate B; B fires → mutate A (cycle)
    pipe(sliceA, sliceB, (srcState, targetDraft) => {
      targetDraft.value = srcState.value;
    });
    pipe(sliceB, sliceA, (srcState, targetDraft) => {
      targetDraft.value = srcState.value;
    });

    // This must resolve and not hang.
    await sliceA.emit("set" as any, (draft) => {
      draft.value = 42;
    });

    // The mutation on A itself must have gone through.
    expect(sliceA.getState().value).toBe(42);
  });

  it("emits a console.warn when a cycle is detected", async () => {
    const sliceA = createSlice({ value: 0 });
    const sliceB = createSlice({ value: 0 });

    pipe(sliceA, sliceB, (srcState, targetDraft) => {
      targetDraft.value = srcState.value;
    });
    pipe(sliceB, sliceA, (srcState, targetDraft) => {
      targetDraft.value = srcState.value;
    });

    await sliceA.emit("set" as any, (draft) => {
      draft.value = 1;
    });

    // At least one cycle-detection warning must have been emitted.
    expect(warnSpy).toHaveBeenCalled();
    const calls = warnSpy.mock.calls.map((c) => String(c[0]));
    expect(calls.some((msg) => msg.includes("[emix]") && msg.includes("cycle"))).toBe(true);
  });

  it("propagates the first mutation even though the cycle is broken", async () => {
    const sliceA = createSlice({ x: 0 });
    const sliceB = createSlice({ x: 0 });

    // A → B (no reverse pipe this time – just a sanity check that the
    // first propagation still works after a previous cycle test).
    pipe(sliceA, sliceB, (srcState, targetDraft) => {
      targetDraft.x = srcState.x + 1;
    });

    await sliceA.emit("set" as any, (draft) => {
      draft.x = 10;
    });

    expect(sliceA.getState().x).toBe(10);
    expect(sliceB.getState().x).toBe(11);
  });
});
