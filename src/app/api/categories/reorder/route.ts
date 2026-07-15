import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getMutationClientId, notifyAppDataUpdated } from '@/server/app-updates';

function isIntegerId(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}

class ReorderTargetNotFoundError extends Error {}

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

    await prisma.$transaction(async (tx) => {
      const affectedRows = await tx.$executeRaw(
        Prisma.sql`
          UPDATE "categories" AS category
          SET "sort_order" = reordered.sort_order
          FROM (
            VALUES ${Prisma.join(categoryIds.map((categoryId, sortOrder) => Prisma.sql`(
              ${categoryId}::integer,
              ${sortOrder}::integer
            )`))}
          ) AS reordered(id, sort_order)
          WHERE category.id = reordered.id
        `,
      );

      if (affectedRows !== categoryIds.length) {
        throw new ReorderTargetNotFoundError('One or more categories were not found');
      }
    });

    await notifyAppDataUpdated(getMutationClientId(request));
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof ReorderTargetNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
