import { NextResponse } from 'next/server';
import { normalizeModStatusKeys } from '@/lib/mod-statuses';
import { prisma } from '@/lib/prisma';
import { notifyAppDataUpdated } from '@/server/app-updates';

// POST create a new mod
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, statusKey, statusKeys, source, url, categoryId } = body;
    const normalizedStatusKeys = normalizeModStatusKeys({
      statusKey,
      statusKeys: Array.isArray(statusKeys) ? statusKeys : undefined,
    });

    if (!name || normalizedStatusKeys.length === 0 || !categoryId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const maxSort = await prisma.mod.aggregate({
      where: { categoryId },
      _max: { sortOrder: true },
    });

    const mod = await prisma.$transaction(async (tx) => {
      const createdMod = await tx.mod.create({
        data: {
          name,
          statusKey: normalizedStatusKeys[0],
          source: source || '',
          url: url || '',
          categoryId,
          sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
        },
      });

      await tx.modStatus.createMany({
        data: normalizedStatusKeys.map((key, index) => ({
          modId: createdMod.id,
          statusKey: key,
          sortOrder: index,
        })),
      });

      return createdMod;
    });

    await notifyAppDataUpdated();
    return NextResponse.json({ ...mod, statusKeys: normalizedStatusKeys }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
