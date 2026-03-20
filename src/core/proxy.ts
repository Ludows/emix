import type { StateDiff } from "../types";

export interface ProxySession {
  deltas: StateDiff[];
  isArrayTransactionActive: boolean;
}

export function createProxySession(): ProxySession {
  return {
    deltas: [],
    isArrayTransactionActive: false,
  };
}

export function createProxy<T extends object>(
  target: T,
  session: ProxySession,
  path: string[] = [],
  depth = 0,
): T {
  // Hard limit: do not proxy beyond depth 10 to avoid infinite recursion on
  // deeply nested or circular-like structures.
  if (depth >= 10) {
    return target;
  }

  return new Proxy(target, {
    get(obj, prop) {
      if (typeof prop === "symbol") return Reflect.get(obj, prop);
      const key = String(prop);
      const value = Reflect.get(obj, key);

      if (Array.isArray(obj) && typeof value === "function") {
        const arrayMethods = [
          "push",
          "pop",
          "shift",
          "unshift",
          "splice",
          "sort",
          "reverse",
        ];
        if (arrayMethods.includes(key)) {
          return (...args: any[]) => {
            const wasActive = session.isArrayTransactionActive;
            session.isArrayTransactionActive = true;

            const prevLength = obj.length;
            const prevArray = [...obj];

            const result = (value as Function).apply(obj, args);

            if (!wasActive) {
              session.isArrayTransactionActive = false;
              if (key === "push") {
                args.forEach((arg, i) => {
                  session.deltas.push({
                    path: [...path, String(prevLength + i)],
                    type: "array/push",
                    prev: undefined,
                    next: arg,
                  });
                });
              } else if (key === "splice") {
                session.deltas.push({
                  path: [...path],
                  type: "array/splice",
                  prev: prevArray,
                  next: [...obj],
                });
              } else if (key === "sort" || key === "reverse") {
                session.deltas.push({
                  path: [...path],
                  type: "array/sort",
                  prev: prevArray,
                  next: [...obj],
                });
              } else {
                session.deltas.push({
                  path: [...path],
                  type: "set",
                  prev: prevArray,
                  next: [...obj],
                });
              }
            }
            return result;
          };
        }
      }

      if (value !== null && typeof value === "object") {
        return createProxy(value, session, [...path, key], depth + 1);
      }
      return value;
    },
    set(obj, prop, value) {
      if (typeof prop === "symbol") {
        return Reflect.set(obj, prop, value);
      }
      const key = String(prop);
      const prev = Reflect.get(obj, key);

      if (!session.isArrayTransactionActive && prev !== value) {
        session.deltas.push({
          path: [...path, key],
          type: "set",
          prev,
          next: value,
        });
      }
      return Reflect.set(obj, prop, value);
    },
    deleteProperty(obj, prop) {
      if (typeof prop === "symbol") {
        return Reflect.deleteProperty(obj, prop);
      }
      const key = String(prop);
      const prev = Reflect.get(obj, key);
      const result = Reflect.deleteProperty(obj, prop);

      if (!session.isArrayTransactionActive) {
        session.deltas.push({
          path: [...path, key],
          type: "delete",
          prev,
          next: undefined,
        });
      }
      return result;
    },
    ownKeys(obj) {
      return Reflect.ownKeys(obj);
    },
    has(obj, prop) {
      return Reflect.has(obj, prop);
    },
    getPrototypeOf(obj) {
      return Reflect.getPrototypeOf(obj);
    },
  });
}

const batchQueue = new Set<() => void>();
let isBatching = false;

export function scheduleNotification(task: () => void) {
  batchQueue.add(task);
  if (!isBatching) {
    isBatching = true;
    queueMicrotask(() => {
      const tasks = Array.from(batchQueue);
      batchQueue.clear();
      isBatching = false;
      tasks.forEach((t) => t());
    });
  }
}
