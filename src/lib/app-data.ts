import type { AppData } from './data';

export function parseAppDataPayload(payload: unknown): AppData | null {
  if (!payload || typeof payload !== 'object') return null;

  const candidate = payload as Partial<AppData>;
  if (!Array.isArray(candidate.statuses)) return null;
  if (!Array.isArray(candidate.categories)) return null;
  if (candidate.packInfo !== null && typeof candidate.packInfo !== 'object') return null;

  return candidate as AppData;
}
