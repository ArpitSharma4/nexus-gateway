import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Database, Server } from 'lucide-react'

export default function SystemMonitor() {
    const [latency, setLatency] = useState(42)

    useEffect(() => {
        const interval = setInterval(() => {
            setLatency(Math.floor(Math.random() * (58 - 32 + 1) + 32))
        }, 3000)
        return () => clearInterval(interval)
    }, [])

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.2, duration: 1, ease: 'easeOut' }}
            className="fixed bottom-8 right-8 z-[100] flex items-center px-4 py-2 bg-slate-900/[0.04] backdrop-blur-xl rounded-full border border-slate-900/5 shadow-2xl select-none pointer-events-none"
        >
            {/* Gateway Status */}
            <div className="flex items-center gap-2 px-2">
                <div className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-40"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </div>
                <div className="flex items-center gap-1.5 min-w-max">
                    <span className="text-[9px] uppercase tracking-[0.15em] font-black text-slate-400">GTWY</span>
                    <span className="text-[10px] font-black italic text-slate-800 tracking-tighter">ACTIVE</span>
                </div>
            </div>

            <div className="w-[1px] h-3 bg-slate-900/10 mx-1" />

            {/* DB Status */}
            <div className="flex items-center gap-2 px-2">
                <Database size={10} className="text-slate-400" />
                <div className="flex items-center gap-1.5 min-w-max">
                    <span className="text-[9px] uppercase tracking-[0.15em] font-black text-slate-400">CORE</span>
                    <span className="text-[10px] font-black italic text-slate-800 tracking-tighter">STABLE</span>
                </div>
            </div>

            <div className="w-[1px] h-3 bg-slate-900/10 mx-1" />

            {/* Latency */}
            <div className="flex items-center gap-2 px-2">
                <Server size={10} className="text-slate-400" />
                <div className="flex items-center gap-1.5 min-w-max">
                    <span className="text-[9px] uppercase tracking-[0.15em] font-black text-slate-400">LAT</span>
                    <span className="text-[10px] font-mono font-black text-emerald-600 tracking-tighter w-9">{latency}ms</span>
                </div>
            </div>
        </motion.div>
    )
}
