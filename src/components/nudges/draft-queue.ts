// Runs the jobs it is given a few at a time, in the order they came in.
export interface DraftQueue {
  run: <T>(job: () => Promise<T>) => Promise<T>;
}

export function createDraftQueue(limit: number): DraftQueue {
  let running = 0;
  const waiting: (() => void)[] = [];

  function next(): void {
    running -= 1;
    waiting.shift()?.();
  }

  async function run<T>(job: () => Promise<T>): Promise<T> {
    if (running >= limit) await new Promise<void>((resolve) => waiting.push(resolve));
    running += 1;
    try {
      return await job();
    } finally {
      next();
    }
  }

  return { run };
}
