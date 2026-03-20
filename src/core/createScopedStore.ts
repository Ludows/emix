import type { SliceState } from "../types";
import { createSlice } from "./createSlice";

/**
 * Creates a scoped slice with an explicit namespace.
 *
 * Unlike `createSlice`, `createScopedStore` is intended for use within a global
 * store where multiple slices coexist. The `namespace` parameter serves as a
 * logical identifier that documents the slice's role in the global store and is
 * attached as metadata on the returned slice. When the slice is registered in a
 * `createStore` call, the namespace matches the key used in the slices map,
 * ensuring that all emitted events are automatically prefixed as
 * `"namespace/eventName"` by the store's routing logic.
 *
 * Use `createScopedStore` instead of `createSlice` when you want to make the
 * intended scope explicit at the definition site, and when you rely on the
 * store's namespaced event routing for cross-slice observation.
 *
 * @example
 * const userSlice = createScopedStore("user", { name: "", age: 0 });
 * // userSlice.namespace === "user"
 * const store = createStore({ user: userSlice });
 * store.emit("user/update", draft => { draft.name = "Alice"; });
 */
export function createScopedStore<TState extends SliceState>(
  namespaceOrState: string | TState,
  initialState?: TState,
) {
  const hasNamespace = typeof namespaceOrState === "string";
  const namespace = hasNamespace ? namespaceOrState : undefined;
  const state = (hasNamespace ? initialState : namespaceOrState) as TState;
  const slice = createSlice<TState>(state);
  return Object.assign(slice, { namespace });
}
