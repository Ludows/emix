import { describe, expect, it, vi } from "vitest";
import { createSlice } from "../../../src/core/createSlice";
import { fallback, retry, timeout } from "../../../src/utils/resilience";

describe("Resilience utilities", () => {
  describe("retry()", () => {
    it("resolves immediately if no error on first attempt", async () => {
      const slice = createSlice({ count: 0 });
      let calls = 0;

      await retry(slice, "test", { attempts: 3 }, async (draft) => {
        calls++;
        draft.count++;
      });

      expect(calls).toBe(1);
      expect(slice.getState().count).toBe(1);
    });

    it("retries on failure and succeeds on 2nd attempt", async () => {
      const slice = createSlice({ count: 0 });
      let calls = 0;

      await retry(slice, "test", { attempts: 3, delay: 10 }, async (draft) => {
        calls++;
        if (calls === 1) throw new Error("fail 1");
        draft.count++;
      });

      expect(calls).toBe(2);
      expect(slice.getState().count).toBe(1);
    });

    it("emits event/failed after all attempts exhausted", async () => {
      const slice = createSlice({ count: 0 });
      const failedHandler = vi.fn();
      slice.on("test/failed", failedHandler);

      await expect(
        retry(slice, "test", { attempts: 3, delay: 10 }, async () => {
          throw new Error("fail always");
        }),
      ).rejects.toThrow("fail always");

      expect(failedHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe("fallback()", () => {
    it("executes fallback mutator when event fails", async () => {
      const slice = createSlice({ count: 0, error: false });

      fallback(slice, "asyncAction", (draft) => {
        draft.error = true;
      });

      // Manually emit failed event to simulate failure
      await slice.emit("asyncAction/failed", () => {});

      expect(slice.getState().error).toBe(true);
    });
  });

  describe("timeout()", () => {
    it("resolves if emission finishes before timeout", async () => {
      const slice = createSlice({ count: 0 });
      await timeout(slice, "inc", 100, (d) => {
        d.count++;
      });
      expect(slice.getState().count).toBe(1);
    });

    it("rejects and emits event/timeout if exceeds delay", async () => {
      vi.useFakeTimers();
      const slice = createSlice({ count: 0 });
      const timeoutHandler = vi.fn();
      slice.on("slow/timeout", timeoutHandler);

      // A mutator that never finishes or takes too long
      const promise = timeout(slice, "slow", 100, async () => {
        await new Promise((r) => setTimeout(r, 1000));
      });

      vi.advanceTimersByTime(100);
      await expect(promise).rejects.toThrow("Timeout of 100ms exceeded");
      expect(timeoutHandler).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it("handles sync mutations in timeout", async () => {
      const slice = createSlice({ count: 0 });
      await timeout(slice, "inc", 100, (d) => {
        d.count++;
      });
      expect(slice.getState().count).toBe(1);
    });

    it("rejects immediately if mutator throws sync", async () => {
      const slice = createSlice({ count: 0 });
      await expect(
        timeout(slice, "err", 100, () => {
          throw new Error("sync error");
        }),
      ).rejects.toThrow("sync error");
    });
    it("hits catch block if emit throws sync", async () => {
      const slice = createSlice({ count: 0 });
      vi.spyOn(slice, "emit").mockImplementation(() => {
        throw new Error("sync emit error");
      });
      await expect(timeout(slice, "err", 100, () => {})).rejects.toThrow(
        "sync emit error",
      );
    });
  });

  describe("retry() edge cases", () => {
    it("handles exponential backoff", async () => {
      vi.useFakeTimers();
      const slice = createSlice({ count: 0 });
      let calls = 0;
      const onRetry = vi.fn();

      const promise = retry(
        slice,
        "test",
        {
          attempts: 3,
          delay: 10,
          backoff: "exponential",
          onRetry,
        },
        async () => {
          calls++;
          throw new Error("fail");
        },
      );

      promise.catch(() => {});

      // 1st attempt: fails immediately
      await vi.runAllTicks();
      expect(calls).toBe(1);

      // wait 10ms for 2nd
      await vi.advanceTimersByTimeAsync(10);
      expect(calls).toBe(2);

      // wait 20ms (exponential) for 3rd
      await vi.advanceTimersByTimeAsync(20);
      expect(calls).toBe(3);

      await expect(promise).rejects.toThrow("fail");
      expect(onRetry).toHaveBeenCalledTimes(2);
      vi.useRealTimers();
    });

    it("rethrows if non-Error is thrown", async () => {
      const slice = createSlice({ count: 0 });
      await expect(
        retry(slice, "test", { attempts: 1 }, () => {
          throw "string error";
        }),
      ).rejects.toBe("string error");
    });
    it("rejects if async mutator rejects", async () => {
      const slice = createSlice({ count: 0 });
      await expect(
        timeout(slice, "err", 100, async () => {
          throw new Error("async error");
        }),
      ).rejects.toThrow("async error");
    });
  });

  describe("retry() coverage", () => {
    it("handles constant backoff explicitly", async () => {
      const slice = createSlice({ a: 1 });
      let calls = 0;
      await retry(
        slice,
        "test",
        { attempts: 2, delay: 0, backoff: "linear" },
        async () => {
          calls++;
          if (calls === 1) throw new Error("fail");
        },
      );
      expect(calls).toBe(2);
    });

    it("handles non-Error objects", async () => {
      const slice = createSlice({ a: 1 });
      await expect(
        retry(slice, "test", { attempts: 1 }, () => {
          throw "string error";
        }),
      ).rejects.toBe("string error");
    });
  });
});
