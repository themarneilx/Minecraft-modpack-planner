import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastAppDataUpdated } from '@/server/realtime';

interface CategoryOrderRequest {
  categoryId: number;
  modIds: number[];
}

function isIntegerId(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}

function parseCategories(value: unknown): CategoryOrderRequest[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const seenCategories = new Set<number>();
  const seenMods = new Set<number>();

  for (const category of value) {
    if (
      typeof category !== 'object' ||
      category === null ||
      !isIntegerId((category as CategoryOrderRequest).categoryId) ||
      !Array.isArray((category as CategoryOrderRequest).modIds)
    ) {
      return null;
    }

    const { categoryId, modIds } = category as CategoryOrderRequest;

    if (seenCategories.has(categoryId)) {
      return null;
    }

    seenCategories.add(categoryId);

    for (const modId of modIds) {
      if (!isIntegerId(modId) || seenMods.has(modId)) {
        return null;
      }

      seenMods.add(modId);
    }
  }

  return value as CategoryOrderRequest[];
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const categories = parseCategories(body?.categories);

    if (!categories) {
      return NextResponse.json({ error: 'Invalid reorder payload' }, { status: 400 });
    }

    const categoryIds = categories.map((category) => category.categoryId);
    const modIds = categories.flatMap((category) => category.modIds);

    const [categoryCount, modCount] = await Promise.all([
      prisma.category.count({ where: { id: { in: categoryIds } } }),
      modIds.length > 0 ? prisma.mod.count({ where: { id: { in: modIds } } }) : Promise.resolve(0),
    ]);

    if (categoryCount !== categoryIds.length) {
      return NextResponse.json({ error: 'One or more categories were not found' }, { status: 404 });
    }

    if (modCount !== modIds.length) {
      return NextResponse.json({ error: 'One or more mods were not found' }, { status: 404 });
    }

    const updates = categories.flatMap((category) =>
      category.modIds.map((modId, sortOrder) =>
        prisma.mod.update({
          where: { id: modId },
          data: {
            categoryId: category.categoryId,
            sortOrder,
          },
        }),
      ),
    );

    if (updates.length > 0) {
      await prisma.$transaction(updates);
    }

    broadcastAppDataUpdated();
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
