import { describe, expect, it, vi } from "vitest";
import { createSlice } from "../../../src/core/createSlice";
import {
  unless,
  when,
  whenAll,
  whenAny,
} from "../../../src/utils/conditionals";

describe("Conditionals utilities", () => {
  it("when() emits only if predicate is true", async () => {
    const slice = createSlice({ count: 0 });
    const mutator = vi.fn((draft) => {
      draft.count++;
    });

    // false
    when(slice, (s) => s.count > 0, "inc", mutator);
    expect(slice.getState().count).toBe(0);
    expect(mutator).not.toHaveBeenCalled();

    // true
    await slice.emit("set", (d) => {
      d.count = 5;
    });
    when(slice, (s) => s.count > 0, "inc", mutator);
    expect(slice.getState().count).toBe(6);
    expect(mutator).toHaveBeenCalled();
  });

  it("unless() emits only if predicate is false", async () => {
    const slice = createSlice({ count: 5 });
    const mutator = vi.fn((draft) => {
      draft.count = 0;
    });

    // true -> should NOT emit
    unless(slice, (s) => s.count > 0, "reset", mutator);
    expect(slice.getState().count).toBe(5);

    // false -> should emit
    await slice.emit("set", (d) => {
      d.count = -1;
    });
    unless(slice, (s) => s.count > 0, "reset", mutator);
    expect(slice.getState().count).toBe(0);
  });

  it("whenAll() emits only if all predicates true", () => {
    const slice = createSlice({ a: 1, b: 2 });
    const mutator = vi.fn();

    whenAll(slice, [(s) => s.a === 1, (s) => s.b === 0], "test", mutator);
    expect(mutator).not.toHaveBeenCalled();

    whenAll(slice, [(s) => s.a === 1, (s) => s.b === 2], "test", mutator);
    expect(mutator).toHaveBeenCalled();
  });

  it("whenAny() emits if at least one predicate true", () => {
    const slice = createSlice({ a: 1, b: 2 });
    const mutator = vi.fn();

    whenAny(slice, [(s) => s.a === 0, (s) => s.b === 0], "test", mutator);
    expect(mutator).not.toHaveBeenCalled();

    whenAny(slice, [(s) => s.a === 1, (s) => s.b === 0], "test", mutator);
    expect(mutator).toHaveBeenCalled();
  });
});
