import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Zap } from 'lucide-react'
import NexusBackground from './NexusBackground'

const messages = [
    'Establishing secure tunnel...',
    'Fetching merchant ledger...',
    'Nexus Layer Active.',
    'Orchestration Engine Stable.',
    'Layer sync in progress...',
]

export default function NexusLoader() {
    const [msgIndex, setMsgIndex] = useState(0)
    const [text, setText] = useState('')
    const [isDeleting, setIsDeleting] = useState(false)

    useEffect(() => {
        const currentMsg = messages[msgIndex]
        const speed = isDeleting ? 20 : 35 // Faster typing to fit 2.5s window

        const timeout = setTimeout(() => {
            if (!isDeleting) {
                setText(currentMsg.slice(0, text.length + 1))
                if (text.length === currentMsg.length) {
                    setTimeout(() => setIsDeleting(true), 400) // Shorter pause
                }
            } else {
                setText(currentMsg.slice(0, text.length - 1))
                if (text.length === 0) {
                    setIsDeleting(false)
                    setMsgIndex((msgIndex + 1) % messages.length)
                }
            }
        }, speed)

        return () => clearTimeout(timeout)
    }, [text, isDeleting, msgIndex])

    return (
        <div className="fixed inset-0 z-[100] bg-white overflow-hidden">
            <NexusBackground active={true}>
                <div className="flex flex-col items-center justify-center min-h-screen relative z-10">
                    <div className="relative flex flex-col items-center">
                        {/* SVG Circle Drawing Animation */}
                        <div className="relative w-32 h-32 flex items-center justify-center">
                            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                                <motion.circle
                                    cx="50"
                                    cy="50"
                                    r="48"
                                    fill="none"
                                    stroke="rgba(79, 70, 229, 0.1)"
                                    strokeWidth="2"
                                />
                                <motion.circle
                                    cx="50"
                                    cy="50"
                                    r="48"
                                    fill="none"
                                    stroke="rgb(79, 70, 229)"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    initial={{ pathLength: 0, opacity: 0 }}
                                    animate={{ pathLength: 1, opacity: 1 }}
                                    transition={{
                                        duration: 2,
                                        ease: "easeInOut",
                                        repeat: Infinity,
                                        repeatDelay: 0.5
                                    }}
                                />
                            </svg>

                            {/* Pulsing Logo */}
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: [0.8, 1.1, 1], opacity: 1 }}
                                transition={{
                                    scale: { repeat: Infinity, duration: 2, ease: "easeInOut" },
                                    opacity: { duration: 0.5 }
                                }}
                                className="bg-indigo-600 p-4 rounded-full shadow-2xl shadow-indigo-200 relative z-10"
                            >
                                <Zap size={32} className="text-white" fill="currentColor" />
                            </motion.div>
                        </div>

                        {/* Typewriter Status Text */}
                        <div className="mt-12 h-6 flex items-center">
                            <span className="text-xs font-black tracking-[0.2em] text-slate-400 uppercase font-mono">
                                {text}
                                <motion.span
                                    animate={{ opacity: [0, 1, 0] }}
                                    transition={{ repeat: Infinity, duration: 0.8 }}
                                    className="inline-block w-1.5 h-3.5 bg-indigo-500 ml-1 mb-[-2px]"
                                />
                            </span>
                        </div>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="mt-4"
                        >
                            <div className="flex gap-1">
                                {[0, 1, 2].map(i => (
                                    <motion.div
                                        key={i}
                                        animate={{
                                            scale: [1, 1.5, 1],
                                            opacity: [0.3, 1, 0.3]
                                        }}
                                        transition={{
                                            repeat: Infinity,
                                            duration: 1,
                                            delay: i * 0.2
                                        }}
                                        className="w-1 h-1 rounded-full bg-indigo-400"
                                    />
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </NexusBackground>
        </div>
    )
}
