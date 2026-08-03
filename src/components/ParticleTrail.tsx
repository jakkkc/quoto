import { useEffect, useRef } from 'react'

// Soft mouse-following particle trail: blue/pink dots with faint connecting
// lines. Self-contained canvas overlay — pointer-events-none so it never
// blocks clicks on the content sitting above it.
interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: string
}

export function ParticleTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let particles: Particle[] = []
    let animationFrame: number
    const colors = ['#3b82f6', '#f472b6']

    function resize() {
      if (!canvas) return
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    function handleMouseMove(e: MouseEvent) {
      for (let i = 0; i < 2; i++) {
        particles.push({
          x: e.clientX,
          y: e.clientY,
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.5) * 0.6,
          life: 1,
          color: colors[Math.floor(Math.random() * colors.length)],
        })
      }
      if (particles.length > 120) particles = particles.slice(-120)
    }
    window.addEventListener('mousemove', handleMouseMove)

    function tick() {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.forEach((p) => {
        p.x += p.vx
        p.y += p.vy
        p.life -= 0.012
      })
      particles = particles.filter((p) => p.life > 0)

      // Faint connecting lines between nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i]
          const b = particles[j]
          const dist = Math.hypot(a.x - b.x, a.y - b.y)
          if (dist < 80) {
            ctx.strokeStyle = `rgba(180, 180, 255, ${0.08 * Math.min(a.life, b.life)})`
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }

      particles.forEach((p) => {
        ctx.beginPath()
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.life * 0.7
        ctx.fill()
        ctx.globalAlpha = 1
      })

      animationFrame = requestAnimationFrame(tick)
    }
    tick()

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(animationFrame)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      aria-hidden="true"
    />
  )
}
