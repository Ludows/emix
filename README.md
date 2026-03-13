# Emix

**Event-driven state management for React — emit to mutate, Proxy to track.**

Emix is a lightweight, predictable state management library that combines the best of event buses, Proxies (via Immer-like drafts), and React Hooks.

## Why Emix?

- **🎯 Event-Driven**: All state changes happen via named events, making your logic easy to track and debug.
- **🚀 Proxy-Based**: Mutate state naturally in mutators — no need for complex immutable boilerplate.
- **⚛️ Fine-Grained**: Components only re-render if the specific data they follow actually changes.
- **🛠️ Battery-Included**: Debounce, throttle, retry, undo/redo, and more built-in.

## Installation

### npm / yarn / pnpm

```bash
npm install @ludoows/emix
```

### CDN

```html
<script type="importmap">
  {
    "imports": {
      "react": "https://esm.sh/react@18",
      "react-dom": "https://esm.sh/react-dom@18",
      "emittery": "https://esm.sh/emittery"
    }
  }
</script>

<script type="module">
  import { createSlice } from "https://cdn.jsdelivr.net/npm/@ludoows/emix/dist/index.js";
</script>
```

> For full CDN usage with hooks and devtools, see [Getting Started](./docs/GETTING_STARTED.md#1-installation).

## Documentation

- 🏁 [**Getting Started**](./docs/GETTING_STARTED.md) - Install and create your first store in 5 minutes.
- 📚 [**API Reference**](./docs/API_REFERENCE.md) - Detailed guide of all functions and hooks.
- 💡 [**Concrete Examples**](./docs/EXAMPLES.md) - Auth flows, search debouncing, resilience, and more.

## Quick Preview

```tsx
import { createSlice } from "@ludoows/emix";
import { useSnapshot } from "@ludoows/emix/hooks";

const counter = createSlice({ count: 0 });

function App() {
  const { count } = useSnapshot(counter);

  return (
    <button
      onClick={() =>
        counter.emit("inc", (d) => {
          d.count++;
        })
      }
    >
      Count: {count}
    </button>
  );
}
```

## License

MIT
