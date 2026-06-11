export const MIN_INITIAL_LOADING_MS = 1300;

export function getRemainingInitialLoadingMs(
  startedAtMs: number,
  nowMs: number,
  minimumMs = MIN_INITIAL_LOADING_MS,
) {
  return Math.max(0, minimumMs - Math.max(0, nowMs - startedAtMs));
}
