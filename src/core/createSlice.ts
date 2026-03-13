import type {
  EmitResult,
  EventContext,
  EventHandler,
  MutatorFn,
  Slice,
  SliceState,
  Unsubscribe,
} from "../types";
import { EventBus } from "./bus";
import { createProxy, createProxySession } from "./proxy";

export function createSlice<
  TState extends SliceState,
  TEvents extends string = string,
>(
  initialState: TState,
): Slice<TState, TEvents> & {
  _addParent: (parent: EventBus<any>, prefix: string) => void;
  _bus: EventBus<TState>;
} {
  let currentState = { ...initialState };
  const bus = new EventBus<TState>();
  const parentBuses = new Map<EventBus<any>, string>();

  function getState() {
    return currentState;
  }

  function emit<E extends TEvents>(
    event: E,
    mutator: MutatorFn<TState>,
  ): EmitResult<TState> {
    const session = createProxySession();
    const nextState = structuredClone(currentState);
    const draft = createProxy(nextState, session) as any;

    const context: EventContext<TState> = {
      event,
      state: currentState,
      draft,
      meta: {},
    };

    const finishMutation = () => {
      currentState = nextState;
      context.diff = session.deltas;

      parentBuses.forEach((prefix, parentBus) => {
        parentBus.emitSync(
          {
            ...context,
            event: `${prefix}/${context.event}`,
            state: { [prefix]: currentState } as any,
          } as any,
          () => {},
        );
      });
    };

    const executeMutation = () => {
      const result = mutator(draft);
      if (result instanceof Promise) {
        return result.then(() => finishMutation());
      }
      finishMutation();
      return Promise.resolve();
    };

    const promise = bus.emitAsync(context, executeMutation);

    const createResult = (
      p: Promise<any>,
    ): EmitResult<TState> & PromiseLike<TState> => {
      const result: any = {
        pipe: (...fns: any[]) =>
          createResult(p.then(() => fns.forEach((fn) => fn(currentState)))),
        then: (onFulfilled?: any, onRejected?: any) =>
          p.then(() => currentState).then(onFulfilled, onRejected),
      };
      return result;
    };

    return createResult(promise);
  }

  function on<E extends TEvents>(
    event: E,
    handler: EventHandler<TState>,
  ): Unsubscribe {
    const busHandler = (ctx: EventContext<TState>) => {
      handler(ctx.state, currentState, ctx.diff || [], ctx);
    };
    bus.on(event, busHandler);
    return () => bus.off(event, busHandler);
  }

  function once<E extends TEvents>(
    event: E,
    handler: EventHandler<TState>,
  ): Unsubscribe {
    const busHandler = (ctx: EventContext<TState>) => {
      handler(ctx.state, currentState, ctx.diff || [], ctx);
      bus.off(event, busHandler);
    };
    bus.on(event, busHandler);
    return () => bus.off(event, busHandler);
  }

  return {
    getState,
    emit,
    on,
    once,
    _bus: bus,
    _addParent(parent: EventBus<any>, prefix: string) {
      parentBuses.set(parent, prefix);
    },
  };
}
