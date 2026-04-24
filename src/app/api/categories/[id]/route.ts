import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastAppDataUpdated } from '@/server/realtime';

type RouteContext = { params: Promise<{ id: string }> };

// PUT update a category
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { name, icon, headerBg } = body;

    const category = await prisma.category.update({
      where: { id: parseInt(id) },
      data: {
        ...(name !== undefined && { name }),
        ...(icon !== undefined && { icon }),
        ...(headerBg !== undefined && { headerBg }),
      },
      include: { mods: true },
    });

    broadcastAppDataUpdated();
    return NextResponse.json(category);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE a category (cascades to mods)
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    await prisma.category.delete({ where: { id: parseInt(id) } });
    broadcastAppDataUpdated();
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
