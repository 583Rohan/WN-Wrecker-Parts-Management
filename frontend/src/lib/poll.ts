// Runs `task` now, then again `ms` after each run FINISHES — so requests never pile up
// if the server is slow — and pauses while the browser tab is hidden. Returns a stop function.
export function startPolling(task: () => Promise<unknown> | void, ms: number): () => void {
  let stopped = false;
  let running = false;
  let timer: number | undefined;

  const schedule = () => {
    if (stopped) return;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => void run(), ms);
  };

  const run = async () => {
    if (stopped || running) return;
    if (document.hidden) return;                 // paused — resumes when the tab is visible again
    running = true;
    try {
      await task();
    } catch {
      /* a failed poll is retried next time */
    } finally {
      running = false;
      schedule();
    }
  };

  const onVisibility = () => {
    if (!document.hidden) {
      window.clearTimeout(timer);
      void run();
    }
  };

  document.addEventListener('visibilitychange', onVisibility);
  void run();

  return () => {
    stopped = true;
    window.clearTimeout(timer);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
