import { describe, expect, it, vi } from "vitest";
import { createSlice } from "../../../src/core/createSlice";
import { persist } from "../../../src/utils/persist";

function makeMockStorage(initial?: Record<string, string>): Storage {
  const store: Record<string, string> = { ...initial };
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach((k) => delete store[k]);
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  } as unknown as Storage;
}

describe("persist utility", () => {
  it("loads state from storage on startup", () => {
    const savedPayload = JSON.stringify({ version: 1, state: { count: 42 } });
    const storage = makeMockStorage({ "my-slice": savedPayload });
    const slice = createSlice({ count: 0 });

    persist(slice, { key: "my-slice", storage, version: 1 });

    expect(slice.getState().count).toBe(42);
  });

  it("saves state to storage after a mutation", async () => {
    const storage = makeMockStorage();
    const slice = createSlice({ count: 0 });

    persist(slice, { key: "my-slice", storage, version: 1 });

    await slice.emit("inc" as any, (d: any) => {
      d.count = 5;
    });

    expect(storage.setItem).toHaveBeenCalled();
    const lastCall = (storage.setItem as ReturnType<typeof vi.fn>).mock.calls.at(-1)!;
    const saved = JSON.parse(lastCall[1]);
    expect(saved).toEqual({ version: 1, state: { count: 5 } });
  });

  it("ignores stale data when version differs and no migrate provided", () => {
    const savedPayload = JSON.stringify({ version: 2, state: { count: 99 } });
    const storage = makeMockStorage({ "my-slice": savedPayload });
    const slice = createSlice({ count: 0 });

    persist(slice, { key: "my-slice", storage, version: 1 });

    // State should remain unchanged since version does not match and no migrate
    expect(slice.getState().count).toBe(0);
  });

  it("calls migrate when version differs and migrate is provided", () => {
    const savedPayload = JSON.stringify({ version: 1, state: { legacyCount: 7 } });
    const storage = makeMockStorage({ "my-slice": savedPayload });
    const slice = createSlice({ count: 0 });
    const migrate = vi.fn((_savedState: unknown, _savedVersion: number) => ({ count: 7 }));

    persist(slice, { key: "my-slice", storage, version: 2, migrate });

    expect(migrate).toHaveBeenCalledWith({ legacyCount: 7 }, 1);
    expect(slice.getState().count).toBe(7);
  });

  it("is a no-op when storage is null/unavailable", () => {
    const slice = createSlice({ count: 0 });

    // Pass storage: null cast as Storage to simulate unavailability
    const cleanup = persist(slice, {
      key: "my-slice",
      storage: null as unknown as Storage,
    });

    // Should not throw and cleanup should be a no-op function
    expect(typeof cleanup).toBe("function");
    expect(() => cleanup()).not.toThrow();
    // State stays unchanged
    expect(slice.getState().count).toBe(0);
  });

  it("cleanup function unsubscribes from slice changes", async () => {
    const storage = makeMockStorage();
    const slice = createSlice({ count: 0 });

    const cleanup = persist(slice, { key: "my-slice", storage, version: 1 });
    cleanup();

    await slice.emit("inc" as any, (d: any) => {
      d.count = 99;
    });

    // setItem should not have been called after cleanup
    expect(storage.setItem).not.toHaveBeenCalled();
  });
});
