'use client'

import { useEffect, useRef, useCallback } from 'react'

interface Particle {
  x: number
  y: number
  originX: number
  originY: number
  vx: number
  vy: number
  radius: number
  color: string
  highlightColor: string
  glowColor: string
}

// Authentic LED matrix yellow/gold palette from user reference
const LED_YELLOW_PALETTE: readonly string[] = [
  '#FFC301', // Bright amber
  '#EAB203', // Deep gold
  '#FF9F00', // Highway orange-gold
  '#FFDB46', // Highlight warm yellow
  '#F8B018', // Primary golden yellow
  '#EAA402', // Warm amber-gold
]

export default function DotMatrixFooter() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const particlesRef = useRef<Particle[]>([])
  const animFrameRef = useRef<number | null>(null)
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({
    x: -9999,
    y: -9999,
    active: false,
  })

  // Tight, low-flexibility burst ripple
  const triggerRipple = useCallback((targetX: number, targetY: number, power = 4) => {
    const particles = particlesRef.current
    if (!particles.length) return

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]
      if (!p) continue

      const dx = p.x - targetX
      const dy = p.y - targetY
      const dist = Math.hypot(dx, dy)
      const maxDist = 90

      if (dist < maxDist && dist > 0) {
        const force = ((maxDist - dist) / maxDist) * power
        p.vx += (dx / dist) * force
        p.vy += (dy / dist) * force
      }
    }
  }, [])

  // Re-generate particles on clean grid
  const initParticles = useCallback(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const rect = container.getBoundingClientRect()
    const width = Math.floor(rect.width)
    if (width <= 0) return

    // Dynamic responsive height providing ample vertical room for taller font size
    const height = width < 480 ? 95 : width < 768 ? 115 : width < 1200 ? 135 : 150

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    canvas.style.width = '100%'
    canvas.style.height = `${height}px`

    const offCanvas = document.createElement('canvas')
    offCanvas.width = width
    offCanvas.height = height
    const offCtx = offCanvas.getContext('2d', { willReadFrequently: true })
    if (!offCtx) return

    offCtx.clearRect(0, 0, width, height)
    offCtx.fillStyle = '#FFFFFF'
    offCtx.textAlign = 'center'
    offCtx.textBaseline = 'middle'

    // Extended horizontal length: allow text to span 92% on mobile and up to 1260px on laptop
    const fontWidthScale = 0.98

    // Responsive horizontal margin guaranteeing zero letter cutoff while maximizing text length
    const maxAvailableWidth = width < 480 ? width * 0.92 : width < 768 ? width * 0.90 : Math.min(width * 0.88, 1260)
    const maxAvailableHeight = height * 0.64 // Ample font size ceiling

    // Binary search for largest font size fitting within bounds with extended length
    let low = 14
    let high = Math.floor(maxAvailableHeight)
    let bestFontSize = low

    while (low <= high) {
      const mid = Math.floor((low + high) / 2)
      offCtx.font = `900 ${mid}px "Archivo Black", "Archivo", "Arial Black", Impact, sans-serif`
      const measured = offCtx.measureText('UDAY TRAVELS').width * fontWidthScale

      if (measured <= maxAvailableWidth) {
        bestFontSize = mid
        low = mid + 1
      } else {
        high = mid - 1
      }
    }

    // Render single-line 'UDAY TRAVELS' with extended horizontal length
    offCtx.save()
    offCtx.translate(width / 2, height * 0.52)
    offCtx.scale(fontWidthScale, 1.0)
    offCtx.font = `900 ${bestFontSize}px "Archivo Black", "Archivo", "Arial Black", Impact, sans-serif`
    offCtx.fillText('UDAY TRAVELS', 0, 0)
    offCtx.restore()

    const imgData = offCtx.getImageData(0, 0, width, height).data

    // Responsive dot-matrix grid step for authentic LED resolution
    // Mobile (<480px): 3.4px step
    // Tablet (<768px): 4.0px step
    // Laptop/Desktop: 4.8px step
    const step = width < 480 ? 3.4 : width < 768 ? 4.0 : 4.8
    const radius = Math.max(1.2, step * 0.32)
    const newParticles: Particle[] = []

    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const idx = (Math.floor(y) * width + Math.floor(x)) * 4
        const alpha = imgData[idx + 3] ?? 0

        if (alpha > 110) {
          const color = LED_YELLOW_PALETTE[Math.floor(Math.random() * LED_YELLOW_PALETTE.length)] ?? '#FFC301'

          // Start EXACTLY on origin — zero loose jitter
          newParticles.push({
            x,
            y,
            originX: x,
            originY: y,
            vx: 0,
            vy: 0,
            radius,
            color,
            highlightColor: '#FFF475',
            glowColor: 'rgba(255, 195, 1, 0.4)',
          })
        }
      }
    }

    particlesRef.current = newParticles
  }, [])

  // Animation render loop with REDUCED FLEXIBILITY (tight, firm, snappy)
  useEffect(() => {
    initParticles()

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const render = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const width = canvas.width / dpr
      const height = canvas.height / dpr

      ctx.save()
      ctx.scale(dpr, dpr)
      // Solid dark background matching user screenshot
      ctx.fillStyle = '#0A0C18'
      ctx.fillRect(0, 0, width, height)

      const mouse = mouseRef.current
      const particles = particlesRef.current

      // TIGHT, REDUCED FLEXIBILITY CONSTANTS
      const mouseRadius = 48 // Small influence radius
      const maxDisplacement = 7 // Clamped max displacement: dots never fly away
      const springK = 0.28 // Very firm spring
      const friction = 0.72 // Quick damping, zero loose jelly oscillation

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        if (!p) continue

        // 1. Gentle local mouse nudge
        if (mouse.active) {
          const dx = p.x - mouse.x
          const dy = p.y - mouse.y
          const dist = Math.hypot(dx, dy)

          if (dist < mouseRadius && dist > 0) {
            const force = ((mouseRadius - dist) / mouseRadius) * 2.2
            p.vx += (dx / dist) * force
            p.vy += (dy / dist) * force
          }
        }

        // 2. Firm spring return to origin
        p.vx += (p.originX - p.x) * springK
        p.vy += (p.originY - p.y) * springK

        // 3. Strong friction damping
        p.vx *= friction
        p.vy *= friction

        // 4. Update position
        p.x += p.vx
        p.y += p.vy

        // 5. Hard clamp displacement — ensures letters always stay 100% structured and readable
        const offX = p.x - p.originX
        const offY = p.y - p.originY
        const offDist = Math.hypot(offX, offY)
        if (offDist > maxDisplacement) {
          p.x = p.originX + (offX / offDist) * maxDisplacement
          p.y = p.originY + (offY / offDist) * maxDisplacement
          p.vx *= 0.5
          p.vy *= 0.5
        }

        // 6. Color highlight when slightly nudged
        const isNudged = offDist > 1.2
        const drawColor = isNudged ? p.highlightColor : p.color

        // 7. Draw circular LED dot
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = drawColor
        ctx.fill()
      }

      ctx.restore()
      animFrameRef.current = requestAnimationFrame(render)
    }

    animFrameRef.current = requestAnimationFrame(render)

    // Accurate resize observer for container width changes (orientation, window resizing)
    let resizeTimer: NodeJS.Timeout
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        initParticles()
      }, 100)
    })

    const container = containerRef.current
    if (container) {
      ro.observe(container)
    }

    // Re-render when web fonts have resolved to guarantee precise typography metrics
    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(() => {
        initParticles()
      })
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      ro.disconnect()
      clearTimeout(resizeTimer)
    }
  }, [initParticles])

  // Mouse & touch handlers with mobile tap support
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    mouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      active: true,
    }
  }

  const handleMouseLeave = () => {
    mouseRef.current = { x: -9999, y: -9999, active: false }
  }

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top
    triggerRipple(clickX, clickY, 3.5)
  }

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !e.touches[0]) return
    const rect = canvas.getBoundingClientRect()
    const touchX = e.touches[0].clientX - rect.left
    const touchY = e.touches[0].clientY - rect.top
    mouseRef.current = {
      x: touchX,
      y: touchY,
      active: true,
    }
    triggerRipple(touchX, touchY, 3.5)
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !e.touches[0]) return
    const rect = canvas.getBoundingClientRect()
    mouseRef.current = {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top,
      active: true,
    }
  }

  const handleTouchEnd = () => {
    mouseRef.current = { x: -9999, y: -9999, active: false }
  }

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden bg-[#0A0C18] select-none border-t border-white/10 flex items-center justify-center"
      aria-label="Uday Travels Dot Matrix Brand Banner"
    >
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="block w-full max-w-full cursor-default touch-none"
      />
    </div>
  )
}
