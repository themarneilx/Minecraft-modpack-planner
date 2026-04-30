import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastAppDataUpdated } from '@/server/realtime';

function isIntegerId(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}

function parseCategoryIds(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const seen = new Set<number>();

  for (const categoryId of value) {
    if (!isIntegerId(categoryId) || seen.has(categoryId)) {
      return null;
    }

    seen.add(categoryId);
  }

  return value;
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const categoryIds = parseCategoryIds(body?.categoryIds);

    if (!categoryIds) {
      return NextResponse.json({ error: 'Invalid category reorder payload' }, { status: 400 });
    }

    const categoryCount = await prisma.category.count({ where: { id: { in: categoryIds } } });

    if (categoryCount !== categoryIds.length) {
      return NextResponse.json({ error: 'One or more categories were not found' }, { status: 404 });
    }

    await prisma.$transaction(
      categoryIds.map((categoryId, sortOrder) =>
        prisma.category.update({
          where: { id: categoryId },
          data: { sortOrder },
        }),
      ),
    );

    broadcastAppDataUpdated();
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
