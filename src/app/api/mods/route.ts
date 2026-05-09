import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notifyAppDataUpdated } from '@/server/app-updates';

// POST create a new mod
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, statusKey, source, url, categoryId } = body;

    if (!name || !statusKey || !categoryId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const maxSort = await prisma.mod.aggregate({
      where: { categoryId },
      _max: { sortOrder: true },
    });

    const mod = await prisma.mod.create({
      data: {
        name,
        statusKey,
        source: source || '',
        url: url || '',
        categoryId,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
    });

    await notifyAppDataUpdated();
    return NextResponse.json(mod, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
