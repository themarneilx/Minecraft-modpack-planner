import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getMutationClientId, notifyAppDataUpdated } from '@/server/app-updates';

interface CategoryOrderRequest {
  categoryId: number;
  modIds: number[];
}

class ReorderTargetNotFoundError extends Error {}

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
    const categoryCount = await prisma.category.count({ where: { id: { in: categoryIds } } });

    if (categoryCount !== categoryIds.length) {
      return NextResponse.json({ error: 'One or more categories were not found' }, { status: 404 });
    }

    const rows = categories.flatMap((category) =>
      category.modIds.map((modId, sortOrder) => ({
        modId,
        categoryId: category.categoryId,
        sortOrder,
      })),
    );

    if (rows.length > 0) {
      await prisma.$transaction(async (tx) => {
        const affectedRows = await tx.$executeRaw(
          Prisma.sql`
            UPDATE "mods" AS mod
            SET
              "category_id" = reordered.category_id,
              "sort_order" = reordered.sort_order
            FROM (
              VALUES ${Prisma.join(rows.map((row) => Prisma.sql`(
                ${row.modId}::integer,
                ${row.categoryId}::integer,
                ${row.sortOrder}::integer
              )`))}
            ) AS reordered(id, category_id, sort_order)
            WHERE mod.id = reordered.id
          `,
        );

        if (affectedRows !== rows.length) {
          throw new ReorderTargetNotFoundError('One or more mods were not found');
        }
      });
    }

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
