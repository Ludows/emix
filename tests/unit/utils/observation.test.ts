import { describe, expect, it, vi } from "vitest";
import { createSlice } from "../../../src/core/createSlice";
import {
  map,
  pipe,
  tap,
  watch,
  watchDeep,
} from "../../../src/utils/observation";

describe("Observation utilities", () => {
  it("tap() executes side effect and continues", async () => {
    const slice = createSlice({ count: 0 });
    const sideEffect = vi.fn();

    tap(slice, "inc" as any, sideEffect);

    await slice.emit("inc" as any, (d) => {
      d.count++;
    });
    expect(sideEffect).toHaveBeenCalled();
    expect(slice.getState().count).toBe(1);
  });

  it("watch() reacts to shallow changes", async () => {
    const slice = createSlice({ count: 0, other: 1 });
    const watcher = vi.fn();

    watch(slice, "count", watcher);

    await slice.emit("inc" as any, (d) => {
      d.count++;
    });
    // handler(nextVal, prevVal, diffs)
    expect(watcher).toHaveBeenCalledWith(1, 0, expect.any(Array));

    await slice.emit("other" as any, (d) => {
      d.other = 2;
    });
    expect(watcher).toHaveBeenCalledTimes(1);
  });

  it("watchDeep() reacts to nested changes", async () => {
    const slice = createSlice({ user: { name: "A", age: 30 } });
    const watcher = vi.fn();

    watchDeep(slice, "user.name", watcher);

    await slice.emit("rename" as any, (d) => {
      d.user.name = "B";
    });
    expect(watcher).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ path: ["user", "name"], next: "B" }),
      ]),
    );
  });

  it("pipe() chains multiple slices", async () => {
    const s1 = createSlice({ a: 1 });
    const s2 = createSlice({ b: 2 });

    pipe(s1, s2, (sourceState, targetDraft) => {
      targetDraft.b = sourceState.a * 10;
    });

    await s1.emit("inc" as any, (d) => {
      d.a = 5;
    });
    expect(s2.getState().b).toBe(50);
  });

  it("map() synchronizes derived values", async () => {
    const source = createSlice({ val: 10 });
    const target = createSlice({ result: 0 });

    map(source, target, (s) => s.val * 2, "result");

    await source.emit("set" as any, (d) => {
      d.val = 5;
    });
    expect(target.getState().result).toBe(10);
  });
});

describe("watch() – path validation", () => {
  it("throws when path is an empty string", () => {
    const slice = createSlice({ count: 0 });
    expect(() => watch(slice, "", () => {})).toThrow(Error);
  });

  it("throws when path starts with a dot", () => {
    const slice = createSlice({ count: 0 });
    expect(() => watch(slice, ".foo", () => {})).toThrow(Error);
  });

  it("throws when path ends with a dot", () => {
    const slice = createSlice({ count: 0 });
    expect(() => watch(slice, "foo.", () => {})).toThrow(Error);
  });

  it("throws when path contains consecutive dots", () => {
    const slice = createSlice({ count: 0 });
    expect(() => watch(slice, "foo..bar", () => {})).toThrow(Error);
  });

  it("does NOT throw for a valid dotted path", () => {
    const slice = createSlice({ foo: { bar: 0 } });
    expect(() => watch(slice, "foo.bar", () => {})).not.toThrow();
  });
});
