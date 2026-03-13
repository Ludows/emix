# API Reference

## Core Functions

### `createSlice<T>(initialState)`

Creates a slice of state.

- **Returns**: A `Slice` object.
- **Methods**:
  - `getState()`: Returns current state.
  - `emit(event, mutator)`: Triggers a state change.
  - `on(event, handler)`: Subscribes to changes.

### `createStore(slices, config?)`

Combines multiple slices into a single store.

- **Config**:
  - `devtools`: Enable Redux DevTools integration.
  - `history`: Enable global undo/redo support.

---

## React Hooks (`emix/hooks`)

### `useSnapshot(slice, options?)`

Subscribe to a slice or a part of it.

```typescript
const { name } = useSnapshot(userSlice);
// Or with selector
const count = useSnapshot(counterSlice, (s) => s.count);
```

### `useAsyncEmit(slice)`

Manage async mutations with native pending/error states.

```typescript
const { emit, isPending, error } = useAsyncEmit(userSlice);
```

---

## Utilities (`emix`)

### Resilience

- `retry(slice, event, config, task)`: Automatic retries with backoff.
- `timeout(promise, ms)`: Fails if not resolved in time.

### History

- `undo(slice)` / `redo(slice)`: Time travel.
- `recordHistory(slice, limit?)`: Enable recording for a slice.

### State

- `fill(slice, data)`: Batch update state.
- `reset(slice)`: Revert to initial state.
- `freeze(slice)`: Temporarily block all mutations.
