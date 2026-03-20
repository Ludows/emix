# API Reference

## Core Functions

### `createSlice<T>(initialState)`

Creates a reactive slice of state.

```typescript
const counter = createSlice({ count: 0 });
```

**Methods:**

| Method | Signature | Description |
|--------|-----------|-------------|
| `getState()` | `() => TState` | Returns the current state (read-only snapshot). |
| `emit(event, mutator)` | `(event, (draft) => void) => EmitResult<TState>` | Mutates state and notifies listeners. |
| `on(event, handler)` | `(event, handler) => Unsubscribe` | Subscribes to a specific event (or all if `undefined`). |
| `once(event, handler)` | `(event, handler) => Unsubscribe` | Subscribes to the next occurrence of an event, then auto-unsubscribes. |
| `reset()` | `() => EmitResult<TState>` | Restores the slice to its initial state (at creation time). |
| `offAll(event?)` | `(event?) => void` | Removes all listeners for a given event, or all listeners if no event is specified. |

---

### `createStore(slices, config?)`

Combines multiple slices into a single store with event bubbling.

```typescript
const store = createStore({ users: userSlice, cart: cartSlice });
```

**Config:**
- `devtools` — Enable Redux DevTools integration.
- `history` — Enable global undo/redo support.

**Methods:**

| Method | Signature | Description |
|--------|-----------|-------------|
| `getState()` | `() => Record<string, any>` | Returns the combined state of all slices. |
| `emit(event, mutator)` | `("slice/event", mutator) => EmitResult` | Emits on a specific slice using `"sliceName/eventName"` routing. |
| `on(event, handler)` | `("slice/event", handler) => Unsubscribe` | Listens to bubbled events from any slice. |
| `transaction(fn)` | `(fn) => Promise<void>` | Runs `fn` atomically — external emissions are queued until `fn` completes. |
| `emitBatch(events[])` | `(events[]) => Promise<void>` | Emits multiple events across slices sequentially. |

```typescript
// transaction — mutations are applied atomically
await store.transaction(async ({ users, cart }) => {
  await users.emit("clear", (d) => { d.list = []; });
  await cart.emit("reset", (d) => { d.items = []; });
});

// emitBatch
await store.emitBatch([
  { slice: "users", event: "setName", mutator: (d) => { d.name = "Alice"; } },
  { slice: "cart",  event: "addItem", mutator: (d) => { d.items.push("book"); } },
]);
```

---

### `createDerivedSlice(dependencies, selector)`

Creates a read-only slice that recomputes when its dependencies change.

```typescript
const totalSlice = createDerivedSlice([cartSlice], (cart) => cart.items.length);
```

---

### `createScopedStore(initialState, namespace?)`

Like `createSlice` but with an optional namespace for organizational purposes.

---

## React Hooks (`@ludoows/emix/hooks`)

### `useSnapshot(slice, selector?, options?)`

Subscribes to a slice and re-renders only when the selected value changes.

```typescript
const { name } = useSnapshot(userSlice);
const count = useSnapshot(counterSlice, (s) => s.count);
```

**Options:** `equals` — custom equality function (default: `Object.is`).

---

### `useEmit(slice, event?)`

Returns a stable emit callback.

```typescript
const emit = useEmit(counterSlice, "increment");
emit((draft) => { draft.count++; });
```

---

### `useAsyncEmit(slice)`

Manages async mutations with built-in `isPending` / `error` state.

```typescript
const { emit, isPending, error } = useAsyncEmit(userSlice);
```

---

### `useSync(slices, selector)`

Subscribes to multiple slices at once via `useSyncExternalStore`.

```typescript
const total = useSync([cartSlice, discountSlice], ([cart, disc]) => cart.total - disc.value);
```

---

### `useFreeze(slice)`

Returns `[isFrozen, freeze, unfreeze]` to block/unblock mutations programmatically.

```typescript
const [isFrozen, freeze, unfreeze] = useFreeze(slice);
```

---

### `useWatch(slice, path, callback)`

Observes a specific path in a slice. Fires `callback(newValue, prevValue)` without causing a React re-render.

```typescript
useWatch(userSlice, "profile.email", (next, prev) => {
  console.log("Email changed from", prev, "to", next);
});
```

---

### `useDebounced(slice, selector, delay, equals?)`

Like `useSnapshot` but debounces React state updates by `delay` ms.

```typescript
const query = useDebounced(searchSlice, (s) => s.query, 300);
// 'query' updates at most every 300ms
```

---

### `useUndo(slice, options?)`

Wraps the history utilities and exposes undo/redo controls as React state.

```typescript
const { undo, redo, canUndo, canRedo } = useUndo(counterSlice, { maxHistory: 20 });
```

**Options:** `maxHistory` — maximum number of history entries (default: 50).

---

### `useBatch()`

Returns a stable function that batches multiple React state updates into a single re-render.

```typescript
const batch = useBatch();
batch(() => {
  emit1((d) => { d.a = 1; });
  emit2((d) => { d.b = 2; });
});
```

---

## Utilities (`@ludoows/emix`)

### State

| Function | Description |
|----------|-------------|
| `fill(slice, data)` | Shallow-merges `data` into the slice state. |
| `reset(slice)` | Reverts to initial state (also available as `slice.reset()`). |
| `merge(slice, data)` | Deep-merges `data` into the slice state. |
| `freeze(slice)` | Blocks all mutations until `unfreeze()` is called. |
| `forget(slice)` | Removes all event listeners from the slice. |

---

### History

| Function | Description |
|----------|-------------|
| `recordHistory(slice, limit?)` | Starts recording state snapshots. Returns an unsubscribe function. |
| `undo(slice)` | Restores the previous snapshot. |
| `redo(slice)` | Re-applies the next snapshot. |

---

### Persistence

#### `persist(slice, options)`

Synchronizes slice state with `localStorage` (or a custom `Storage`).

```typescript
const cleanup = persist(userSlice, {
  key: "user-v1",
  version: 1,
  migrate: (saved, version) => ({ ...defaultState, ...saved }),
});

// Call cleanup() to stop persistence
```

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `key` | `string` | Storage key. |
| `storage` | `Storage` | Default: `localStorage`. Pass a custom storage (e.g. `sessionStorage`). |
| `version` | `number` | Default: `1`. Increment when the shape changes. |
| `migrate` | `(saved, version) => TState` | Called when the saved version doesn't match. Return the migrated state. |

---

### Validation

#### `validatedEmit(slice, validator, event, mutator)`

Emits only if the validator approves the resulting state, otherwise returns errors without mutating.

```typescript
const result = await validatedEmit(
  formSlice,
  (state) => state.email.includes("@") ? true : ["Invalid email"],
  "submit",
  (draft) => { draft.submitted = true; }
);

if (!result.success) {
  console.log(result.errors); // ["Invalid email"]
}
```

---

### Slice utilities

#### `cloneSlice(source, override?)`

Creates an independent copy of a slice with the same interface.

```typescript
const formCopy = cloneSlice(formSlice, { isDirty: false });
// formCopy is fully isolated — no shared listeners with formSlice
```

#### `computed(dependencies, selector, options?)`

Creates a memoized derived slice that only updates when the computed value actually changes.

```typescript
const fullName = computed(
  [firstNameSlice, lastNameSlice],
  (first, last) => `${first.value} ${last.value}`,
  { equals: (a, b) => a === b }
);
```

**Options:** `equals` — custom equality function to skip unnecessary updates (default: `Object.is`).

---

### Observation

| Function | Signature | Description |
|----------|-----------|-------------|
| `watch(slice, path, handler)` | `(slice, path, (val, prev, diffs) => void) => Unsubscribe` | Fires when a specific dot-notation path changes. |
| `watchDeep(slice, path, handler)` | `(slice, path, (diffs) => void) => Unsubscribe` | Fires when any nested change occurs under `path`. |
| `pipe(source, target, mutator, options?)` | - | Propagates mutations from one slice to another with cycle detection. |
| `map(source, target, selector, targetKey)` | - | Maps a derived value from source into a key on target. |
| `tap(slice, event, handler)` | - | Reacts to a specific event without subscribing to the full context. |

---

### Resilience

| Function | Description |
|----------|-------------|
| `retry(slice, event, config, task)` | Retries `task` with configurable backoff. Emits `event/retry`, `event/failed`. |
| `timeout(promise, ms)` | Rejects if the promise doesn't resolve within `ms`. |
| `debounce(fn, ms)` | Returns a debounced version of `fn`. |
| `throttle(fn, ms)` | Returns a throttled version of `fn`. |

---

### Lifecycle

| Function | Description |
|----------|-------------|
| `before(slice, event, handler)` | Runs `handler` before the event mutates state. |
| `after(slice, event, handler)` | Runs `handler` after the event mutates state. |
| `around(slice, event, handler)` | Wraps the mutation — useful for logging or timing. |
| `intercept(slice, event, handler)` | Can block or transform a mutation before it is applied. |

---

### Conditionals

| Function | Description |
|----------|-------------|
| `when(slice, predicate, handler)` | Fires `handler` only when `predicate(state)` is `true`. |
| `unless(slice, predicate, handler)` | Fires `handler` only when `predicate(state)` is `false`. |
| `once(slice, predicate, handler)` | Fires `handler` only the first time `predicate` is satisfied. |
| `onceTrue(slice, event, handler)` | Fires `handler` only the first time a specific event occurs. |
