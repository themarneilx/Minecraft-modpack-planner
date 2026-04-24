import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastAppDataUpdated } from '@/server/realtime';

type RouteContext = { params: Promise<{ id: string }> };

// PUT update a mod (status, name, etc.)
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { name, statusKey, source, url } = body;

    const mod = await prisma.mod.update({
      where: { id: parseInt(id) },
      data: {
        ...(name !== undefined && { name }),
        ...(statusKey !== undefined && { statusKey }),
        ...(source !== undefined && { source }),
        ...(url !== undefined && { url }),
      },
    });

    broadcastAppDataUpdated();
    return NextResponse.json(mod);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE a mod
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    await prisma.mod.delete({ where: { id: parseInt(id) } });
    broadcastAppDataUpdated();
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
