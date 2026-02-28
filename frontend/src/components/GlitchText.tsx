import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

export default function GlitchText({ text, className }: { text: string; className?: string }) {
    const [glitchText, setGlitchText] = useState(text)
    const [isGlitching, setIsGlitching] = useState(false)

    useEffect(() => {
        const interval = setInterval(() => {
            if (Math.random() > 0.9) {
                setIsGlitching(true)
                const original = text
                const words = ["ERROR", "VOID", "FAIL", "NULL"]
                setGlitchText(words[Math.floor(Math.random() * words.length)])

                setTimeout(() => {
                    setGlitchText(original)
                    setIsGlitching(false)
                }, 150)
            }
        }, 3000)
        return () => clearInterval(interval)
    }, [text])

    return (
        <div className={`relative inline-block ${className}`}>
            {/* Base Text */}
            <motion.span
                animate={isGlitching ? { x: [-2, 2, -1, 1, 0] } : {}}
                transition={{ duration: 0.1 }}
                className="relative block"
            >
                {glitchText}
            </motion.span>

            {/* RGB Splits */}
            {isGlitching && (
                <>
                    <motion.span
                        className="absolute top-0 left-0 text-rose-500 opacity-80 mix-blend-screen"
                        animate={{ x: [-8, 8, -6], y: [2, -2, 2] }}
                        transition={{ duration: 0.08, repeat: Infinity }}
                    >
                        {glitchText}
                    </motion.span>
                    <motion.span
                        className="absolute top-0 left-0 text-cyan-500 opacity-80 mix-blend-screen"
                        animate={{ x: [8, -8, 6], y: [-2, 2, -2] }}
                        transition={{ duration: 0.08, repeat: Infinity }}
                    >
                        {glitchText}
                    </motion.span>
                </>
            )}
        </div>
    )
}
