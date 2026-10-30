import { ApiClientError } from "@/lib/api-client";

export interface LoadError {
  message: string;
  debugId?: string;
}

export function toLoadError(error: unknown): LoadError {
  if (error instanceof ApiClientError) {
    return { message: error.message, debugId: error.debugId };
  }
  return { message: error instanceof Error ? error.message : "Could not load your data." };
}
