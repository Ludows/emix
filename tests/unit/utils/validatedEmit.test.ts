import { describe, expect, it, vi } from "vitest";
import { createSlice } from "../../../src/core/createSlice";
import { validatedEmit } from "../../../src/utils/validatedEmit";

describe("validatedEmit utility", () => {
  it("emits and returns success:true when validator returns true", async () => {
    const slice = createSlice({ count: 0 });
    const validator = vi.fn(() => true as const);

    const result = await validatedEmit(
      slice,
      validator,
      "inc" as any,
      (draft: any) => {
        draft.count = 10;
      },
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.count).toBe(10);
    }
    expect(slice.getState().count).toBe(10);
  });

  it("does NOT emit and returns success:false when validator returns errors", async () => {
    const slice = createSlice({ count: 0 });
    const listener = vi.fn();
    slice.on("inc" as any, listener);

    const validator = vi.fn(() => ["count must be positive"]);

    const result = await validatedEmit(
      slice,
      validator,
      "inc" as any,
      (draft: any) => {
        draft.count = -5;
      },
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toEqual(["count must be positive"]);
    }
    // The listener should NOT have been called
    expect(listener).not.toHaveBeenCalled();
    // State must remain unchanged
    expect(slice.getState().count).toBe(0);
  });

  it("errors contain all messages returned by the validator", async () => {
    const slice = createSlice({ name: "", age: -1 });
    const validator = (_draft: any) => [
      "name is required",
      "age must be >= 0",
    ];

    const result = await validatedEmit(
      slice,
      validator,
      "set" as any,
      (draft: any) => {
        draft.name = "";
        draft.age = -1;
      },
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toHaveLength(2);
      expect(result.errors).toContain("name is required");
      expect(result.errors).toContain("age must be >= 0");
    }
  });

  it("validator receives the post-mutator state (draft)", async () => {
    const slice = createSlice({ count: 0 });
    const validator = vi.fn((draft: any) => {
      if (draft.count < 0) return ["count cannot be negative"];
      return true as const;
    });

    await validatedEmit(
      slice,
      validator,
      "dec" as any,
      (draft: any) => {
        draft.count = 5;
      },
    );

    // Validator should have seen count: 5 (post-mutation), not 0
    expect(validator).toHaveBeenCalledWith(expect.objectContaining({ count: 5 }));
  });
});
