import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const LOG_MESSAGES = [
    "Scanning ports: 80, 443, 8080...",
    "Gateway handshake timeout (Stripe_v3)...",
    "Quantum link severed at Layer 4.",
    "Re-routing traffic via Frankfurt-West.",
    "Entropy detected in orchestration engine.",
    "Checksum mismatch in transaction pipe.",
    "Heartbeat lost on AWS-US-EAST-1 nodes.",
    "Initializing failover sequence...",
    "Encrypting secure handshake...",
    "Handshake rejected: invalid signature.",
    "Packet loss exceeding 45% threshold.",
    "Attempting tunnel bypass...",
    "Nexus Core internal temperature nominal.",
    "Waiting for signal feedback..."
]

export default function DiagnosticConsole() {
    const [logs, setLogs] = useState<string[]>([])

    useEffect(() => {
        const interval = setInterval(() => {
            setLogs(prev => {
                const next = [...prev, LOG_MESSAGES[Math.floor(Math.random() * LOG_MESSAGES.length)]]
                if (next.length > 8) return next.slice(1)
                return next
            })
        }, 1500)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="fixed bottom-8 left-8 w-64 font-mono text-[9px] text-slate-400 pointer-events-none select-none">
            <div className="flex flex-col gap-1 overflow-hidden">
                <AnimatePresence mode="popLayout">
                    {logs.map((log, i) => (
                        <motion.div
                            key={`${log}-${i}`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex gap-2"
                        >
                            <span className="text-indigo-400/50">[{new Date().toLocaleTimeString().split(' ')[0]}]</span>
                            <span className="truncate">{log}</span>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
            <div className="mt-2 h-px w-full bg-slate-200/50" />
            <div className="mt-1 flex justify-between uppercase tracking-widest font-black text-[8px] opacity-40">
                <span>Diag_v4.2</span>
                <span className="animate-pulse">Active</span>
            </div>
        </div>
    )
}
