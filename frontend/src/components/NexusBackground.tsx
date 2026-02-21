import { useEffect, useRef, useCallback, useState } from 'react'
import { apiEvents } from '../lib/api'

/* ── Types ──────────────────────────────────────────────────────────── */

type Particle = {
    x: number
    y: number
    vx: number
    vy: number
    r: number
    /** 0 = far / slow, 1 = near / fast — drives parallax */
    depth: number
    /** Per-particle phase offset for ambient drift */
    phase: number
    /** 0..1 glow intensity, decays over time */
    glow: number
}

type NexusBackgroundProps = {
    /** When true, particles speed up and shift to a brighter blue. */
    active?: boolean
    children: React.ReactNode
}

/* ── Config ─────────────────────────────────────────────────────────── */

const PARTICLE_COUNT = 144
const CONNECTION_DIST = 155
const MOUSE_RADIUS = 200
const MOUSE_FORCE = 0.014
const BASE_SPEED = 0.25
const ACTIVE_SPEED = 0.6
const DRIFT_AMP = 0.15          // ambient floating amplitude
const DRIFT_FREQ = 0.0004       // ambient floating frequency
const PARALLAX_RANGE = 0.45     // max parallax slowdown (depth=0 → 1-0.45 = 55% speed)
const GLOW_RADIUS = 220         // px around hovered input to trigger glow
const GLOW_DECAY = 0.97

const RIPPLE_SPEED = 4.5        // pixels per frame expansion
const RIPPLE_MAX_DIST = 1400    // max radius before fading
const SURGE_BOOST = 1.5         // 50% increase

const IDLE_COLOR = { r: 165, g: 180, b: 252 }   // indigo-200
const ACTIVE_COLOR = { r: 99, g: 152, b: 255 }   // brighter blue
const GLOW_COLOR = { r: 99, g: 102, b: 241 }     // indigo-500

/* ── Component ──────────────────────────────────────────────────────── */

export default function NexusBackground({ active = false, children }: NexusBackgroundProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const particles = useRef<Particle[]>([])
    const mouse = useRef({ x: -9999, y: -9999 })
    const hoveredInputCenter = useRef<{ x: number; y: number } | null>(null)
    const animId = useRef(0)
    const activeRef = useRef(active)
    const startTime = useRef(Date.now())

    // Network Surge & Ripple State
    const [isSurging, setIsSurging] = useState(false)
    const surgeRef = useRef(false)
    const rippleDist = useRef(-1) // Current radius of the ripple, -1 = inactive

    activeRef.current = active
    surgeRef.current = isSurging

    /* ── Init particles ────────────────────────────────────────────── */

    const initParticles = useCallback((w: number, h: number) => {
        const arr: Particle[] = []
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const angle = Math.random() * Math.PI * 2
            const speed = BASE_SPEED * (0.3 + Math.random() * 0.7)
            const depth = Math.random()  // 0 = far, 1 = near
            arr.push({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                r: 0.8 + depth * 1.4,  // far = smaller, near = bigger
                depth,
                phase: Math.random() * Math.PI * 2,
                glow: 0,
            })
        }
        particles.current = arr
    }, [])

    /* ── Animation loop ────────────────────────────────────────────── */

    const draw = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const dpr = window.devicePixelRatio || 1
        const w = canvas.width / dpr
        const h = canvas.height / dpr
        const isActive = activeRef.current
        const isSurging_ = surgeRef.current

        // Combine base active state with API surge boost
        const speedMul = (isActive ? ACTIVE_SPEED / BASE_SPEED : 1) * (isSurging_ ? SURGE_BOOST : 1)
        const opacityMul = isSurging_ ? 1.5 : 1

        const col = isActive || isSurging_ ? ACTIVE_COLOR : IDLE_COLOR
        const mx = mouse.current.x
        const my = mouse.current.y
        const now = Date.now()
        const elapsed = now - startTime.current
        const hic = hoveredInputCenter.current

        // Update ripple
        if (rippleDist.current !== -1) {
            rippleDist.current += RIPPLE_SPEED
            if (rippleDist.current > RIPPLE_MAX_DIST) rippleDist.current = -1
        }

        ctx.save()
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.scale(dpr, dpr)

        /* ── Radial spotlight gradient ────────────────────────────── */
        const grd = ctx.createRadialGradient(w / 2, h * 0.42, 0, w / 2, h * 0.42, Math.max(w, h) * 0.7)
        grd.addColorStop(0, 'rgba(255,255,255,0.55)')
        grd.addColorStop(0.45, 'rgba(255,255,255,0.12)')
        grd.addColorStop(1, 'rgba(224,231,255,0.18)')  // #e0e7ff
        ctx.fillStyle = grd
        ctx.fillRect(0, 0, w, h)

        const pts = particles.current

        // Update positions
        for (const p of pts) {
            const parallax = 1 - PARALLAX_RANGE * (1 - p.depth)

            const dx = mx - p.x
            const dy = my - p.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < MOUSE_RADIUS && dist > 1) {
                const force = MOUSE_FORCE * parallax
                p.vx += (dx / dist) * force
                p.vy += (dy / dist) * force
            }

            const driftX = Math.sin(elapsed * DRIFT_FREQ + p.phase) * DRIFT_AMP
            const driftY = Math.cos(elapsed * DRIFT_FREQ * 0.7 + p.phase * 1.3) * DRIFT_AMP

            p.x += (p.vx + driftX) * speedMul * parallax
            p.y += (p.vy + driftY) * speedMul * parallax

            p.vx *= 0.997
            p.vy *= 0.997

            const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
            const maxSpd = BASE_SPEED * 2 * speedMul
            if (spd > maxSpd) {
                p.vx = (p.vx / spd) * maxSpd
                p.vy = (p.vy / spd) * maxSpd
            }

            if (p.x < -10) p.x = w + 10
            if (p.x > w + 10) p.x = -10
            if (p.y < -10) p.y = h + 10
            if (p.y > h + 10) p.y = -10

            if (hic) {
                const gdx = hic.x - p.x
                const gdy = hic.y - p.y
                const gDist = Math.sqrt(gdx * gdx + gdy * gdy)
                if (gDist < GLOW_RADIUS) {
                    p.glow = Math.max(p.glow, 1 - gDist / GLOW_RADIUS)
                }
            }

            // Ripple interaction: nodes glow as the wave passes
            if (rippleDist.current !== -1) {
                const rdx = w / 2 - p.x
                const rdy = h / 2 - p.y
                const rDist = Math.sqrt(rdx * rdx + rdy * rdy)
                const rippleWidth = 100
                if (Math.abs(rDist - rippleDist.current) < rippleWidth) {
                    const rippleIntensity = 1 - Math.abs(rDist - rippleDist.current) / rippleWidth
                    p.glow = Math.max(p.glow, rippleIntensity * 0.8)
                }
            }

            p.glow *= GLOW_DECAY
            if (p.glow < 0.01) p.glow = 0
        }

        // Draw connections
        ctx.lineWidth = 0.7
        for (let i = 0; i < pts.length; i++) {
            for (let j = i + 1; j < pts.length; j++) {
                const dx = pts[i].x - pts[j].x
                const dy = pts[i].y - pts[j].y
                const d = dx * dx + dy * dy
                if (d < CONNECTION_DIST * CONNECTION_DIST) {
                    const dist = Math.sqrt(d)
                    const alpha = (1 - dist / CONNECTION_DIST) * 0.15 * opacityMul
                    const avgDepth = (pts[i].depth + pts[j].depth) / 2

                    const lineAlpha = alpha * (0.5 + avgDepth * 0.5)
                    ctx.beginPath()
                    ctx.moveTo(pts[i].x, pts[i].y)
                    ctx.lineTo(pts[j].x, pts[j].y)
                    ctx.strokeStyle = `rgba(${col.r},${col.g},${col.b},${lineAlpha})`
                    ctx.stroke()
                }
            }
        }

        // Draw particles
        for (const p of pts) {
            const baseAlpha = (0.2 + p.depth * 0.25) * opacityMul
            ctx.beginPath()
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
            ctx.fillStyle = `rgba(${col.r},${col.g},${col.b},${baseAlpha})`
            ctx.fill()

            if (p.glow > 0.02) {
                const glowR = p.r + 4 + p.glow * 8
                const gradient = ctx.createRadialGradient(p.x, p.y, p.r, p.x, p.y, glowR)
                gradient.addColorStop(0, `rgba(${GLOW_COLOR.r},${GLOW_COLOR.g},${GLOW_COLOR.b},${p.glow * 0.5})`)
                gradient.addColorStop(1, `rgba(${GLOW_COLOR.r},${GLOW_COLOR.g},${GLOW_COLOR.b},0)`)
                ctx.beginPath()
                ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2)
                ctx.fillStyle = gradient
                ctx.fill()
            }
        }

        ctx.restore()
        animId.current = requestAnimationFrame(draw)
    }, [])

    /* ── Setup & teardown ──────────────────────────────────────────── */

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const resize = () => {
            const dpr = window.devicePixelRatio || 1
            canvas.width = window.innerWidth * dpr
            canvas.height = window.innerHeight * dpr
            canvas.style.width = window.innerWidth + 'px'
            canvas.style.height = window.innerHeight + 'px'
            if (particles.current.length === 0) {
                initParticles(window.innerWidth, window.innerHeight)
            }
        }

        const handleMouse = (e: MouseEvent) => {
            mouse.current = { x: e.clientX, y: e.clientY }
        }

        const handleLeave = () => {
            mouse.current = { x: -9999, y: -9999 }
        }

        const handleFocusIn = (e: FocusEvent) => {
            const el = e.target as HTMLElement
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                const rect = el.getBoundingClientRect()
                hoveredInputCenter.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
            }
        }
        const handleFocusOut = () => {
            hoveredInputCenter.current = null
        }

        // Network Surge / Ripple Listeners
        const onSurge = () => setIsSurging(true)
        const onRipple = () => {
            setIsSurging(false)
            rippleDist.current = 0
        }

        apiEvents.onSurge(onSurge)
        apiEvents.onRipple(onRipple)

        resize()
        window.addEventListener('resize', resize)
        window.addEventListener('mousemove', handleMouse)
        document.addEventListener('mouseleave', handleLeave)
        document.addEventListener('focusin', handleFocusIn)
        document.addEventListener('focusout', handleFocusOut)

        animId.current = requestAnimationFrame(draw)

        return () => {
            cancelAnimationFrame(animId.current)
            apiEvents.offSurge(onSurge)
            apiEvents.offRipple(onRipple)
            window.removeEventListener('resize', resize)
            window.removeEventListener('mousemove', handleMouse)
            document.removeEventListener('mouseleave', handleLeave)
            document.removeEventListener('focusin', handleFocusIn)
            document.removeEventListener('focusout', handleFocusOut)
        }
    }, [draw, initParticles])

    return (
        <div className="relative min-h-screen">
            <canvas
                ref={canvasRef}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    zIndex: 0,
                    pointerEvents: 'none',
                    background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)',
                }}
            />
            <div className="relative" style={{ zIndex: 1 }}>
                {children}
            </div>
        </div>
    )
}
