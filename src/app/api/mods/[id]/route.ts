import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { normalizeModStatusKeys } from '@/lib/mod-statuses';
import { prisma } from '@/lib/prisma';
import { getMutationClientId, notifyAppDataUpdated } from '@/server/app-updates';

type RouteContext = { params: Promise<{ id: string }> };

// PUT update a mod (status, name, etc.)
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const modId = parseInt(id);
    const body = await request.json();
    const { name, statusKey, statusKeys, source, url } = body;
    const shouldUpdateStatuses = statusKey !== undefined || statusKeys !== undefined;

    const mod = await prisma.$transaction(async (tx) => {
      const currentMod = shouldUpdateStatuses
        ? await tx.mod.findUnique({ where: { id: modId }, select: { statusKey: true } })
        : null;
      const normalizedStatusKeys = shouldUpdateStatuses
        ? normalizeModStatusKeys({
            statusKey: statusKey ?? currentMod?.statusKey,
            statusKeys: Array.isArray(statusKeys) ? statusKeys : undefined,
          })
        : null;

      const updatedMod = await tx.mod.update({
        where: { id: modId },
        data: {
          ...(name !== undefined && { name }),
          ...(normalizedStatusKeys && { statusKey: normalizedStatusKeys[0] }),
          ...(source !== undefined && { source }),
          ...(url !== undefined && { url }),
        },
      });

      if (normalizedStatusKeys) {
        await tx.modStatus.deleteMany({ where: { modId } });
        await tx.modStatus.createMany({
          data: normalizedStatusKeys.map((key, index) => ({
            modId,
            statusKey: key,
            sortOrder: index,
          })),
        });

        return { ...updatedMod, statusKeys: normalizedStatusKeys };
      }

      const indicators = await tx.modStatus.findMany({
        where: { modId },
        orderBy: { sortOrder: 'asc' },
        select: { statusKey: true },
      });

      return {
        ...updatedMod,
        statusKeys: normalizeModStatusKeys({
          statusKey: updatedMod.statusKey,
          statusKeys: indicators.map((indicator) => indicator.statusKey),
        }),
      };
    });

    await notifyAppDataUpdated(getMutationClientId(request));
    return NextResponse.json(mod);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE a mod
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    await prisma.mod.delete({ where: { id: parseInt(id) } });
    await notifyAppDataUpdated(getMutationClientId(request));
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
