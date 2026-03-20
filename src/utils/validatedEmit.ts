import type { Slice } from "../types";

export type ValidationResult = true | string[];

export async function validatedEmit<TState, TEvent extends string>(
  slice: Slice<TState, TEvent>,
  validator: (draft: TState) => ValidationResult,
  event: TEvent,
  mutator: (draft: TState) => void,
): Promise<{ success: true; state: TState } | { success: false; errors: string[] }> {
  const clone = structuredClone(slice.getState()) as TState;
  mutator(clone);

  const result = validator(clone);

  if (result === true) {
    await slice.emit(event, mutator as any);
    return { success: true, state: slice.getState() };
  }

  return { success: false, errors: result };
}
