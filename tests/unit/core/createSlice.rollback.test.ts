import { describe, expect, it } from "vitest";
import { createSlice } from "../../../src/core/createSlice";

describe("createSlice – mutator rollback", () => {
  it("restores state when the mutator throws synchronously", async () => {
    const slice = createSlice({ count: 0 });

    await expect(
      slice.emit("inc", (draft) => {
        draft.count = 99;
        throw new Error("sync error");
      }),
    ).rejects.toThrow("sync error");

    expect(slice.getState().count).toBe(0);
  });

  it("restores state when the mutator returns a rejected Promise (async throw)", async () => {
    const slice = createSlice({ count: 0 });

    await expect(
      slice.emit("inc", async (draft) => {
        draft.count = 99;
        throw new Error("async error");
      }),
    ).rejects.toThrow("async error");

    expect(slice.getState().count).toBe(0);
  });

  it("allows a normal emit after a rollback", async () => {
    const slice = createSlice({ count: 0 });

    // First: a failing emit that should roll back.
    await expect(
      slice.emit("fail", (draft) => {
        draft.count = 99;
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    expect(slice.getState().count).toBe(0);

    // Then: a successful emit must work as expected.
    await slice.emit("inc", (draft) => {
      draft.count = 5;
    });

    expect(slice.getState().count).toBe(5);
  });
});
