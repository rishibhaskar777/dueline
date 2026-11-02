const PAUSE_MS = 600;

// A database that has been asleep can refuse or time out the first connection and answer the next.
// This is for the calls a visitor makes first (health check, sign-in), not for writes.
export async function retryOnce<T>(task: () => Promise<T>, pauseMs: number = PAUSE_MS): Promise<T> {
  try {
    return await task();
  } catch {
    await new Promise((resolve) => setTimeout(resolve, pauseMs));
    return task();
  }
}
