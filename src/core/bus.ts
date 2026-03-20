import Emittery from "emittery";
import type { EventContext, Middleware } from "../types";

export class EventBus<TState> {
  private emitter = new Emittery();
  private middlewares: Middleware<TState>[] = [];

  /**
   * Maps a user-supplied listener (passed to `on(undefined, listener)`) to the
   * onAny-wrapper that was actually registered with Emittery, so that
   * `off(undefined, listener)` can look it up and remove the correct wrapper.
   */
  private anyWrappers = new Map<
    (data: any) => void | Promise<void>,
    (eventName: PropertyKey, data: any) => void | Promise<void>
  >();

  use(middleware: Middleware<TState>) {
    this.middlewares.push(middleware);
  }

  on(
    event: string | undefined,
    listener: (data: any) => void | Promise<void>,
    signal?: AbortSignal,
  ) {
    let unsubscribe: () => void;

    if (event) {
      unsubscribe = this.emitter.on(event, listener);
    } else {
      // Wrap the listener so Emittery's onAny receives (eventName, data).
      // Store the wrapper keyed by the original listener so off() can find it.
      const wrapper = (_: PropertyKey, data: any) => listener(data);
      this.anyWrappers.set(listener, wrapper);
      unsubscribe = this.emitter.onAny(wrapper);
    }

    if (signal) {
      signal.addEventListener("abort", () => unsubscribe(), { once: true });
    }
    return unsubscribe;
  }

  once(event: string) {
    return this.emitter.once(event);
  }

  off(
    event: string | undefined,
    listener: (data: any) => void | Promise<void>,
  ) {
    if (event) {
      this.emitter.off(event, listener);
    } else {
      // Retrieve the wrapper that was registered for this listener and remove it.
      const wrapper = this.anyWrappers.get(listener);
      if (wrapper) {
        this.emitter.offAny(wrapper);
        this.anyWrappers.delete(listener);
      }
      // If no wrapper is found the listener was never registered via on(undefined, …);
      // silently ignore — this mirrors the behaviour of emitter.off() for unknown listeners.
    }
  }

  clearAll(event?: string): void {
    if (event !== undefined) {
      this.emitter.clearListeners(event);
    } else {
      this.emitter.clearListeners();
      this.anyWrappers.clear();
    }
  }

  private async runMiddlewaresAsync(
    context: EventContext<TState>,
    mutation: () => Promise<void>,
  ): Promise<void> {
    const dispatch = async (i: number): Promise<void> => {
      if (i === this.middlewares.length) {
        await mutation();
        return;
      }
      const fn = this.middlewares[i];
      if (fn) {
        await fn(context, () => dispatch(i + 1));
      }
    };
    await dispatch(0);
  }

  /**
   * Emit a `$error` internal event so devtools / user code can observe errors.
   * Falls back to `console.error` when nobody is listening to `$error`.
   */
  private handleError(event: string, error: unknown): void {
    const listenerCount = this.emitter.listenerCount("$error");
    if (listenerCount > 0) {
      // Fire-and-forget: we are already in an error path, avoid infinite loops.
      this.emitter.emit("$error", { event, error }).catch(console.error);
    } else {
      console.error(error);
    }
  }

  async emitAsync(
    context: EventContext<TState>,
    mutation: () => Promise<void>,
  ): Promise<void> {
    await this.runMiddlewaresAsync(context, mutation);
    await this.emitter.emit(context.event, context);
  }

  emitSync(context: EventContext<TState>, mutation: () => void): void {
    let isMutated = false;
    const syncMutation = () => {
      if (!isMutated) {
        mutation();
        isMutated = true;
      }
    };

    const dispatch = (i: number): void | Promise<void> => {
      if (i === this.middlewares.length) {
        syncMutation();
        return;
      }
      const fn = this.middlewares[i];
      if (fn) {
        const next = () => {
          const res = dispatch(i + 1);
          return res instanceof Promise ? res : Promise.resolve(res);
        };
        return fn(context, next as any);
      }
    };

    const run = dispatch(0);
    if (run instanceof Promise) {
      run
        .catch((error) => this.handleError(context.event, error))
        .finally(() => {
          this.emitter
            .emit(context.event, context)
            .catch((error) => this.handleError(context.event, error));
        });
    } else {
      this.emitter
        .emit(context.event, context)
        .catch((error) => this.handleError(context.event, error));
    }
  }
}
