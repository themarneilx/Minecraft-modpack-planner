import { prisma } from '@/lib/prisma';
import { broadcastAppDataUpdated } from './realtime';

export async function notifyAppDataUpdated() {
  const now = new Date();
  const existingPack = await prisma.packInfo.findFirst();
  const pack = existingPack
    ? await prisma.packInfo.update({
        where: { id: existingPack.id },
        data: { updatedAt: now },
      })
    : await prisma.packInfo.create({
        data: {
          updatedAt: now,
        },
      });
  const updatedAt = pack.updatedAt.toISOString();

  broadcastAppDataUpdated(updatedAt);
  return updatedAt;
}
