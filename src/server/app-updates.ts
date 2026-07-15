import { prisma } from '@/lib/prisma';
import { normalizeRealtimeClientId, REALTIME_CLIENT_HEADER } from '@/lib/realtime-protocol';
import { broadcastAppDataUpdated } from './realtime';

export function getMutationClientId(request: Request) {
  return normalizeRealtimeClientId(request.headers.get(REALTIME_CLIENT_HEADER));
}

export async function notifyAppDataUpdated(
  sourceClientId: string | null = null,
  confirmedUpdatedAt?: Date,
) {
  const now = confirmedUpdatedAt ?? new Date();
  const updateResult = confirmedUpdatedAt
    ? null
    : await prisma.packInfo.updateMany({ data: { updatedAt: now } });

  if (updateResult?.count === 0) {
    await prisma.packInfo.create({
        data: {
          updatedAt: now,
        },
      });
  }

  const updatedAt = now.toISOString();
  broadcastAppDataUpdated(updatedAt, sourceClientId);
  return updatedAt;
}
