import type { MutatorFn, RetryConfig, Slice } from "../types";

export function retry<TState, TEvent extends string>(
  slice: Slice<TState, TEvent>,
  event: TEvent,
  config: RetryConfig<"linear" | "exponential">,
  mutator: MutatorFn<TState>,
): Promise<void> {
  const maxAttempts = config.attempts;
  const delayMs = config.delay || 1000;

  const attemptMutation = async (attempt: number): Promise<void> => {
    try {
      if (attempt > 1) {
        slice.emit(`${event}/retry` as TEvent, (draft: any) => {
          /* empty but valid mutator */
        });
      }
      const promise = slice.emit(event, mutator) as any;
      if (promise && promise.then) {
        await new Promise((res, rej) => promise.then(res).catch?.(rej));
      }
    } catch (error) {
      if (error instanceof Error) {
        if (attempt >= maxAttempts) {
          slice.emit(`${event}/failed` as TEvent, (draft: any) => {
            /* empty but valid mutator */
          });
          throw error;
        }

        let waitTime = delayMs;
        if (config.backoff === "exponential") {
          waitTime = delayMs * Math.pow(2, attempt - 1);
          (config.onRetry as any)?.(attempt, waitTime, error);
        } else {
          (config.onRetry as any)?.(attempt, error);
        }

        await new Promise((r) => setTimeout(r, waitTime));
        return attemptMutation(attempt + 1);
      }
      throw error;
    }
  };

  return attemptMutation(1);
}

export function fallback<TState, TEvent extends string>(
  slice: Slice<TState, TEvent>,
  event: TEvent,
  mutator: MutatorFn<TState>,
) {
  return slice.on(`${event}/failed` as TEvent, () => {
    slice.emit(event, mutator);
  });
}

export function timeout<TState, TEvent extends string>(
  slice: Slice<TState, TEvent>,
  event: TEvent,
  ms: number,
  mutator: MutatorFn<TState>,
): Promise<void> {
  let timer: any;
  return Promise.race([
    new Promise<void>((_, reject) => {
      timer = setTimeout(() => {
        slice.emit(`${event}/timeout` as TEvent, (draft: any) => {
          /* empty context mutator */
        });
        reject(new Error(`Timeout of ${ms}ms exceeded for event ${event}`));
      }, ms);
    }),
    new Promise<void>((resolve, reject) => {
      try {
        const res = slice.emit(event, mutator) as any;
        Promise.resolve(res)
          .then(() => {
            clearTimeout(timer);
            resolve();
          })
          .catch((e) => {
            clearTimeout(timer);
            reject(e);
          });
      } catch (e) {
        clearTimeout(timer);
        reject(e);
      }
    }),
  ]);
}
