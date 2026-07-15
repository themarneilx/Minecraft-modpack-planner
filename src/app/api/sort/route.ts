import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { parseBoardSortPayload } from '@/lib/board-sort-payload';
import { prisma } from '@/lib/prisma';
import { getMutationClientId, notifyAppDataUpdated } from '@/server/app-updates';

class SortTargetNotFoundError extends Error {}

export async function PATCH(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid board sort payload' }, { status: 400 });
  }

  const payload = parseBoardSortPayload(body);

  if (!payload) {
    return NextResponse.json({ error: 'Invalid board sort payload' }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const referencedCategoryIds = [
        ...(payload.categoryIds ?? []),
        ...(payload.categories?.map((category) => category.categoryId) ?? []),
      ];
      const uniqueCategoryIds = [...new Set(referencedCategoryIds)];
      const categoryCount = await tx.category.count({
        where: { id: { in: uniqueCategoryIds } },
      });

      if (categoryCount !== uniqueCategoryIds.length) {
        throw new SortTargetNotFoundError('One or more categories were not found');
      }

      if (payload.categoryIds) {
        const affectedCategories = await tx.$executeRaw(
          Prisma.sql`
            UPDATE "categories" AS category
            SET "sort_order" = reordered.sort_order
            FROM (
              VALUES ${Prisma.join(payload.categoryIds.map((categoryId, sortOrder) => Prisma.sql`(
                ${categoryId}::integer,
                ${sortOrder}::integer
              )`))}
            ) AS reordered(id, sort_order)
            WHERE category.id = reordered.id
          `,
        );

        if (affectedCategories !== payload.categoryIds.length) {
          throw new SortTargetNotFoundError('One or more categories were not found');
        }
      }

      const rows = (payload.categories ?? []).flatMap((category) =>
        category.modIds.map((modId, sortOrder) => ({
          modId,
          categoryId: category.categoryId,
          sortOrder,
        })),
      );

      if (rows.length > 0) {
        const affectedMods = await tx.$executeRaw(
          Prisma.sql`
            UPDATE "mods" AS mod
            SET "sort_order" = reordered.sort_order
            FROM (
              VALUES ${Prisma.join(rows.map((row) => Prisma.sql`(
                ${row.modId}::integer,
                ${row.categoryId}::integer,
                ${row.sortOrder}::integer
              )`))}
            ) AS reordered(id, category_id, sort_order)
            WHERE mod.id = reordered.id
              AND mod.category_id = reordered.category_id
          `,
        );

        if (affectedMods !== rows.length) {
          throw new SortTargetNotFoundError(
            'One or more mods were not found in their referenced categories',
          );
        }
      }
    });

    await notifyAppDataUpdated(getMutationClientId(request));
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof SortTargetNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }

    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
