import type { AppData } from './data';

export function parseAppDataPayload(payload: unknown): AppData | null {
  if (!payload || typeof payload !== 'object') return null;

  const candidate = payload as Partial<AppData>;
  if (!Array.isArray(candidate.statuses)) return null;
  if (!Array.isArray(candidate.categories)) return null;
  if (candidate.packInfo !== null && typeof candidate.packInfo !== 'object') return null;

  return candidate as AppData;
}

function describeResponseStatus(response: Response) {
  return `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}`;
}

export async function readAppDataResponse(response: Response): Promise<AppData> {
  const responseBody = await response.text();
  let payload: unknown;

  try {
    payload = JSON.parse(responseBody) as unknown;
  } catch {
    const responseKind = responseBody.trim() ? 'a non-JSON response' : 'an empty response';
    throw new Error(
      `Failed to load modpack data (${describeResponseStatus(response)}): server returned ${responseKind}. Check the app server and reverse proxy logs.`,
    );
  }

  if (!response.ok) {
    const errorMessage = payload && typeof payload === 'object' && 'error' in payload
      ? String((payload as { error: unknown }).error)
      : `Failed to load modpack data (${describeResponseStatus(response)})`;
    throw new Error(errorMessage);
  }

  const appData = parseAppDataPayload(payload);
  if (!appData) {
    throw new Error(`Failed to load modpack data (${describeResponseStatus(response)}): invalid response payload.`);
  }

  return appData;
}
