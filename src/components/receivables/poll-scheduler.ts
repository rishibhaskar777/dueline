interface RefreshOptions {
  // True when the slower data (health) is due for a re-read as well.
  slow: boolean;
}

interface PollerOptions {
  refresh: (options: RefreshOptions) => Promise<void>;
  intervalMs: number;
  slowIntervalMs: number;
  isVisible: () => boolean;
}

export interface Poller {
  start: () => void;
  stop: () => void;
  // Refreshes now unless the tab is hidden or a refresh is already running.
  trigger: () => void;
}

export function createPoller({
  refresh,
  intervalMs,
  slowIntervalMs,
  isVisible,
}: PollerOptions): Poller {
  let timer: ReturnType<typeof setInterval> | undefined;
  let running = false;
  let lastSlowAt: number | undefined;

  function trigger(): void {
    if (running || !isVisible()) return;
    running = true;
    const now = Date.now();
    const slow = lastSlowAt === undefined || now - lastSlowAt >= slowIntervalMs;
    if (slow) lastSlowAt = now;
    const done = (): void => {
      running = false;
    };
    refresh({ slow }).then(done, done);
  }

  return {
    start() {
      if (timer === undefined) timer = setInterval(trigger, intervalMs);
    },
    stop() {
      clearInterval(timer);
      timer = undefined;
    },
    trigger,
  };
}
