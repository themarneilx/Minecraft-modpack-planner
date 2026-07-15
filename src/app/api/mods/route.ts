import { NextResponse } from 'next/server';
import { normalizeModStatusKeys } from '@/lib/mod-statuses';
import { prisma } from '@/lib/prisma';
import { getMutationClientId, notifyAppDataUpdated } from '@/server/app-updates';

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

    const mod = await prisma.mod.create({
      data: {
        name,
        statusKey: normalizedStatusKeys[0],
        source: source || '',
        url: url || '',
        categoryId,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
        statusIndicators: {
          create: normalizedStatusKeys.map((key, index) => ({
            statusKey: key,
            sortOrder: index,
          })),
        },
      },
    });

    await notifyAppDataUpdated(getMutationClientId(request));
    return NextResponse.json({ ...mod, statusKeys: normalizedStatusKeys }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
