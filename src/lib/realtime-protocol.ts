export const REALTIME_CLIENT_HEADER = 'x-tree-emporium-client';

export interface AppDataUpdatedMessage {
  type: 'app-data-updated';
  updatedAt: string;
  sourceClientId: string | null;
}

export function normalizeRealtimeClientId(value: string | null | undefined) {
  if (!value) return null;
  const normalized = value.trim();
  return /^[a-zA-Z0-9-]{8,80}$/.test(normalized) ? normalized : null;
}

export function parseAppDataUpdatedMessage(value: unknown): AppDataUpdatedMessage | null {
  if (!value || typeof value !== 'object') return null;

  const message = value as Partial<AppDataUpdatedMessage>;
  if (message.type !== 'app-data-updated' || typeof message.updatedAt !== 'string') {
    return null;
  }

  return {
    type: 'app-data-updated',
    updatedAt: message.updatedAt,
    sourceClientId: normalizeRealtimeClientId(message.sourceClientId),
  };
}
