export interface AsyncStatus {
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;
  attempt: number;
}

export type RetryConfig<TBackoff extends "linear" | "exponential"> = {
  attempts: number;
  delay?: number;
  backoff?: TBackoff;
  onRetry?: TBackoff extends "exponential"
    ? (attempt: number, delay: number, error: Error) => void
    : (attempt: number, error: Error) => void;
};

export interface RetryOptions {
  attempts: number;
  delay?: number;
  backoff?: "linear" | "exponential";
  onRetry?: (attempt: number, error: Error) => void;
}
