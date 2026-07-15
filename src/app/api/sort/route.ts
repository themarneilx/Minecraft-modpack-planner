import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { parseBoardSortPayload } from '@/lib/board-sort-payload';
import { hasCompleteBoardSortCoverage } from '@/lib/board-sort-snapshot';
import { prisma } from '@/lib/prisma';
import { getMutationClientId, notifyAppDataUpdated } from '@/server/app-updates';

class BoardSortConflictError extends Error {}

const BOARD_SORT_CONFLICT_MESSAGE = 'Board changed before sorting. Refresh and try again.';

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
      if (payload.categories) {
        await tx.$executeRaw(
          Prisma.sql`LOCK TABLE "categories", "mods" IN SHARE ROW EXCLUSIVE MODE`,
        );
      } else {
        await tx.$executeRaw(
          Prisma.sql`LOCK TABLE "categories" IN SHARE ROW EXCLUSIVE MODE`,
        );
      }

      const currentCategories = await tx.category.findMany({
        select: { id: true },
      });
      const currentMods = payload.categories
        ? await tx.mod.findMany({ select: { id: true, categoryId: true } })
        : [];
      const modIdsByCategory = new Map(
        currentCategories.map((category) => [category.id, [] as number[]]),
      );

      for (const mod of currentMods) {
        modIdsByCategory.get(mod.categoryId)?.push(mod.id);
      }

      if (!hasCompleteBoardSortCoverage(payload, {
        categoryIds: currentCategories.map((category) => category.id),
        categories: currentCategories.map((category) => ({
          categoryId: category.id,
          modIds: modIdsByCategory.get(category.id) ?? [],
        })),
      })) {
        throw new BoardSortConflictError(BOARD_SORT_CONFLICT_MESSAGE);
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
          throw new BoardSortConflictError(BOARD_SORT_CONFLICT_MESSAGE);
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
          throw new BoardSortConflictError(BOARD_SORT_CONFLICT_MESSAGE);
        }
      }
    });
  } catch (err) {
    if (err instanceof BoardSortConflictError) {
      return NextResponse.json({ error: BOARD_SORT_CONFLICT_MESSAGE }, { status: 409 });
    }

    console.error('Failed to sort board', err);
    return NextResponse.json({ error: 'Failed to sort board' }, { status: 500 });
  }

  try {
    await notifyAppDataUpdated(getMutationClientId(request));
  } catch (err) {
    console.error('Board sort committed but update notification failed', err);
  }

  return NextResponse.json({ success: true });
}
