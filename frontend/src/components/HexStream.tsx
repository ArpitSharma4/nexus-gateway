import { useEffect, useRef } from 'react'

export default function HexStream() {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const resize = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
        }

        window.addEventListener('resize', resize)
        resize()

        const characters = '0123456789ABCDEF'
        const fontSize = 14
        const columns = Math.ceil(canvas.width / fontSize)
        const drops: number[] = new Array(columns).fill(1).map(() => Math.random() * -100)

        const draw = () => {
            // Occasional full screen glitch flicker
            if (Math.random() > 0.99) {
                ctx.fillStyle = 'rgba(79, 70, 229, 0.05)'
                ctx.fillRect(0, 0, canvas.width, canvas.height)
            }

            ctx.fillStyle = 'rgba(248, 250, 252, 0.05)'
            ctx.fillRect(0, 0, canvas.width, canvas.height)

            ctx.fillStyle = 'rgba(79, 70, 229, 0.12)'
            ctx.font = `${fontSize}px monospace`

            for (let i = 0; i < drops.length; i++) {
                const text = characters.charAt(Math.floor(Math.random() * characters.length))

                // Randomly jitter some characters
                const xOffset = Math.random() > 0.98 ? (Math.random() - 0.5) * 10 : 0
                ctx.fillText(text, i * fontSize + xOffset, drops[i] * fontSize)

                if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0
                }
                drops[i] += 0.5
            }
        }

        const interval = setInterval(draw, 50)
        return () => {
            clearInterval(interval)
            window.removeEventListener('resize', resize)
        }
    }, [])

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none z-0"
            style={{ opacity: 0.6 }}
        />
    )
}
