export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; return NextResponse.json({ bookingId: id, status: 'pending' }) }
