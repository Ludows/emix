import Emittery from "emittery";
import type { EventContext, Middleware } from "../types";

export class EventBus<TState> {
  private emitter = new Emittery();
  private middlewares: Middleware<TState>[] = [];

  use(middleware: Middleware<TState>) {
    this.middlewares.push(middleware);
  }

  on(
    event: string | undefined,
    listener: (data: any) => void | Promise<void>,
    signal?: AbortSignal,
  ) {
    const unsubscribe = event
      ? this.emitter.on(event, listener)
      : this.emitter.onAny((_, data) => listener(data));

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
      // Note: Emittery's offAny requires the same wrapper or original for onAny.
      // But Emittery.onAny returns an unsubscribe fn, which is easier to use.
      // For manual 'off', we might need to store the wrappers if we want to support it.
      // Currently our 'on' returns unsubscribe, so 'off' is less critical but good to have.
      this.emitter.offAny(listener as any);
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
      run.catch(console.error).finally(() => {
        this.emitter.emit(context.event, context).catch(console.error);
      });
    } else {
      this.emitter.emit(context.event, context).catch(console.error);
    }
  }
}
