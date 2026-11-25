export const runtime = 'nodejs'
import { NextRequest } from 'next/server'
import { seatBus, SeatUpdatePayload } from '@/lib/server/realtime-bus'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const route = searchParams.get('route')
  const date = searchParams.get('date')
  const tripId = searchParams.get('tripId')

  if (!route || !date || !tripId) {
    return new Response(JSON.stringify({ error: 'Missing route, date, or tripId' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const channel = `seats:${route}_${date}_${tripId}`
  let cleanup: (() => void) | null = null

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()

      const send = (data: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {
          // Stream might be closed by client
        }
      }

      // Initial connection greeting
      send({
        type: 'connected',
        channel,
        timestamp: new Date().toISOString(),
      })

      // Listener for real-time seat chart updates
      const onUpdate = (payload: SeatUpdatePayload) => {
        send({
          type: 'seat_update',
          ...payload,
        })
      }

      seatBus.on(channel, onUpdate)

      // 15-second heartbeat to keep connection alive
      const heartbeatTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'))
        } catch {
          clearInterval(heartbeatTimer)
        }
      }, 15000)

      cleanup = () => {
        seatBus.off(channel, onUpdate)
        clearInterval(heartbeatTimer)
      }
    },
    cancel() {
      if (cleanup) cleanup()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
