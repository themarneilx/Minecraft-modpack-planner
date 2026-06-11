import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notifyAppDataUpdated } from '@/server/app-updates';

type RouteContext = { params: Promise<{ id: string }> };

// PUT update a status
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { label, color, textColor, key } = body;

    const status = await prisma.status.update({
      where: { id: parseInt(id) },
      data: {
        ...(label !== undefined && { label }),
        ...(color !== undefined && { color }),
        ...(textColor !== undefined && { textColor }),
        ...(key !== undefined && { key }),
      },
    });

    await notifyAppDataUpdated();
    return NextResponse.json(status);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE a status
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    // Check if any mods use this status
    const status = await prisma.status.findUnique({ where: { id: parseInt(id) } });
    if (!status) {
      return NextResponse.json({ error: 'Status not found' }, { status: 404 });
    }

    const [primaryMods, indicatorMods] = await Promise.all([
      prisma.mod.findMany({ where: { statusKey: status.key }, select: { id: true } }),
      prisma.modStatus.findMany({ where: { statusKey: status.key }, select: { modId: true } }),
    ]);
    const modCount = new Set([
      ...primaryMods.map((mod) => mod.id),
      ...indicatorMods.map((indicator) => indicator.modId),
    ]).size;

    if (modCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${modCount} mod(s) use this status` },
        { status: 409 },
      );
    }

    await prisma.status.delete({ where: { id: parseInt(id) } });
    await notifyAppDataUpdated();
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
