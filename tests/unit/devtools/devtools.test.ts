import { describe, expect, it, vi, beforeEach } from "vitest";
import { createSlice } from "../../../src/core/createSlice";
import { createStore } from "../../../src/core/createStore";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal Redux DevTools mock whose subscribe callback can be invoked
 *  from the test to simulate incoming DevTools messages. */
function makeDevToolsMock() {
  let subscriberCb: ((message: any) => void) | null = null;

  const devToolsInstance = {
    init: vi.fn(),
    send: vi.fn(),
    subscribe: vi.fn((cb: (message: any) => void) => {
      subscriberCb = cb;
      // DevTools returns an unsubscribe function.
      return () => {
        subscriberCb = null;
      };
    }),
  };

  const extension = {
    connect: vi.fn(() => devToolsInstance),
  };

  const sendMessage = (message: any) => {
    subscriberCb?.(message);
  };

  return { extension, devToolsInstance, sendMessage };
}

function jumpToStateMessage(stateJson: string) {
  return {
    type: "DISPATCH",
    payload: { type: "JUMP_TO_STATE" },
    state: stateJson,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("devtools – JUMP_TO_STATE handling", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("ignores a JUMP_TO_STATE message with invalid JSON", async () => {
    const { extension, sendMessage } = makeDevToolsMock();
    (window as any).__REDUX_DEVTOOLS_EXTENSION__ = extension;

    // Import after setting the mock so the module picks it up.
    const { devtools } = await import("../../../src/devtools");

    const userSlice = createSlice({ name: "Alice" });
    const store = createStore({ user: userSlice });

    devtools(store);

    sendMessage(jumpToStateMessage("THIS IS NOT JSON {{{"));

    // State must be unchanged.
    expect(store.user.getState().name).toBe("Alice");

    delete (window as any).__REDUX_DEVTOOLS_EXTENSION__;
  });

  it("ignores a JUMP_TO_STATE message with unknown slice keys", async () => {
    const { extension, sendMessage } = makeDevToolsMock();
    (window as any).__REDUX_DEVTOOLS_EXTENSION__ = extension;

    const { devtools } = await import("../../../src/devtools");

    const userSlice = createSlice({ name: "Alice" });
    const store = createStore({ user: userSlice });

    devtools(store);

    // "ghost" is not a key of the store's slices.
    sendMessage(jumpToStateMessage(JSON.stringify({ ghost: { name: "Bob" } })));

    expect(store.user.getState().name).toBe("Alice");

    delete (window as any).__REDUX_DEVTOOLS_EXTENSION__;
  });

  it("ignores a JUMP_TO_STATE message whose slice state contains unknown keys", async () => {
    const { extension, sendMessage } = makeDevToolsMock();
    (window as any).__REDUX_DEVTOOLS_EXTENSION__ = extension;

    const { devtools } = await import("../../../src/devtools");

    const userSlice = createSlice({ name: "Alice" });
    const store = createStore({ user: userSlice });

    devtools(store);

    // "unknownKey" does not exist in userSlice's state.
    sendMessage(
      jumpToStateMessage(
        JSON.stringify({ user: { name: "Bob", unknownKey: 99 } }),
      ),
    );

    expect(store.user.getState().name).toBe("Alice");

    delete (window as any).__REDUX_DEVTOOLS_EXTENSION__;
  });

  it("applies a valid JUMP_TO_STATE message and updates slice state", async () => {
    const { extension, sendMessage } = makeDevToolsMock();
    (window as any).__REDUX_DEVTOOLS_EXTENSION__ = extension;

    const { devtools } = await import("../../../src/devtools");

    const userSlice = createSlice({ name: "Alice" });
    const store = createStore({ user: userSlice });

    devtools(store);

    sendMessage(
      jumpToStateMessage(JSON.stringify({ user: { name: "Bob" } })),
    );

    // fill() is synchronous, so the state change is immediate.
    expect(store.user.getState().name).toBe("Bob");

    delete (window as any).__REDUX_DEVTOOLS_EXTENSION__;
  });

  it("returns a no-op cleanup when __REDUX_DEVTOOLS_EXTENSION__ is absent", async () => {
    delete (window as any).__REDUX_DEVTOOLS_EXTENSION__;

    const { devtools } = await import("../../../src/devtools");

    const userSlice = createSlice({ name: "Alice" });
    const store = createStore({ user: userSlice });

    const cleanup = devtools(store);
    expect(() => cleanup()).not.toThrow();
  });
});
