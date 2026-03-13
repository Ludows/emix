# Getting Started with Emix

Emix is an **event-driven state management library** for React. It uses **Proxies** for natural mutations and an **event bus** for predictable communication.

## 1. Installation

### Via npm / yarn / pnpm

```bash
npm install emix
# or
yarn add emix
# or
pnpm add emix
```

### Via CDN (ESM)

Emix is available on [jsDelivr](https://www.jsdelivr.com/) and [unpkg](https://unpkg.com/) via ES modules. Make sure React is loaded first.

```html
<!-- React + ReactDOM (required peer dependencies) -->
<script type="importmap">
  {
    "imports": {
      "react": "https://esm.sh/react@18",
      "react-dom": "https://esm.sh/react-dom@18",
      "emittery": "https://esm.sh/emittery"
    }
  }
</script>

<!-- Emix core -->
<script type="module">
  import { createSlice, createStore } from "https://cdn.jsdelivr.net/npm/emix/dist/index.js";

  const counter = createSlice({ count: 0 });

  counter.emit("inc", (draft) => {
    draft.count++;
  });
</script>
```

> [!NOTE]
> CDN usage is best suited for quick prototypes or vanilla HTML pages. For production apps, prefer the npm install with a bundler (Vite, webpack, etc.) to benefit from tree-shaking.

#### Sub-entries via CDN

```html
<script type="module">
  // Hooks (requires React)
  import { useSnapshot } from "https://cdn.jsdelivr.net/npm/emix/dist/hooks.js";

  // Devtools
  import { EmixDevtools } from "https://cdn.jsdelivr.net/npm/emix/dist/devtools.js";
</script>
```

## 2. Core Concepts

Emix revolves around two main concepts:

- **Slice**: A piece of state with its own events and data.
- **Store**: A collection of slices that can talk to each other.

## 3. Your First Slice

Create a file `todoSlice.ts`:

```typescript
import { createSlice } from "@ludoows/emix";

// Interface is optional but recommended
interface TodoState {
  todos: string[];
  filter: "all" | "done";
}

export const todoSlice = createSlice<TodoState>({
  todos: [],
  filter: "all",
});

// Actions are events. You "emit" to change state.
export const addTodo = (text: string) =>
  todoSlice.emit("addTodo", (draft) => {
    draft.todos.push(text);
  });
```

> [!TIP]
> Inside `emit`, you receive a **draft**. You can mutate it directly like a regular object. Emix will track the changes and notify React.

## 4. Setup the Store

In `store.ts`:

```typescript
import { createStore } from "@ludoows/emix";
import { todoSlice } from "./todoSlice";

export const store = createStore({
  todos: todoSlice,
});
```

## 5. Connect to React

Use the `useSnapshot` hook to read state. It is **fine-grained**: your component only re-renders if the data it reads actually changes.

```tsx
import { useSnapshot } from "@ludoows/emix/hooks";
import { todoSlice, addTodo } from "./todoSlice";

function TodoList() {
  // Component tracks 'todos' path automatically
  const { todos } = useSnapshot(todoSlice);

  return (
    <div>
      <button onClick={() => addTodo("New Task")}>Add</button>
      <ul>
        {todos.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </div>
  );
}
```

## Next Steps

- Learn more about [API Reference](./API_REFERENCE.md)
- Check [Concrete Examples](./EXAMPLES.md)
