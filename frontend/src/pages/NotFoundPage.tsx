import { motion } from 'framer-motion'
import { ExternalLink, Terminal } from 'lucide-react'
import StatusOverlay from '../components/StatusOverlay'
import GlitchText from '../components/GlitchText'
import { useEffect, useState } from 'react'

export default function NotFoundPage() {
    const [isOnline, setIsOnline] = useState(navigator.onLine)

    useEffect(() => {
        const handleOnline = () => setIsOnline(true)
        const handleOffline = () => setIsOnline(false)
        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)
        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    const handleRetry = () => {
        window.location.reload()
    }

    return (
        <StatusOverlay>
            <div className="flex flex-col items-center gap-12 max-w-lg px-6">
                {/* Glitchy Centerpiece */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                    className="relative"
                >
                    {/* Chromatic aberration panel with lens distortion feel */}
                    <div className="absolute -inset-8 bg-indigo-500/10 blur-3xl rounded-full animate-pulse" />
                    <div className="absolute -inset-1 bg-gradient-to-tr from-rose-500/10 via-transparent to-cyan-500/10 blur-sm rounded-[3rem] opacity-50" />

                    <div className="relative bg-white/10 backdrop-blur-3xl border border-white/20 rounded-[3rem] px-24 py-16 shadow-[0_0_100px_rgba(79,70,229,0.15)] flex flex-col items-center justify-center overflow-hidden">

                        {/* Lens reflection highlight */}
                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/20 via-transparent to-indigo-500/5 pointer-events-none" />
                        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-white/5 rotate-45 pointer-events-none blur-3xl" />

                        <GlitchText
                            text="404"
                            className="text-9xl font-black text-slate-900 tracking-tighter select-none"
                        />

                        <div className="mt-2 flex items-center gap-2">
                            <div className="w-1 h-1 bg-rose-500 rounded-full animate-ping" />
                            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">Signal_Lost</span>
                        </div>

                        {/* Scanner sweep */}
                        <motion.div
                            className="absolute left-0 right-0 h-0.5 bg-indigo-500/20 z-10"
                            animate={{ top: ['0%', '100%', '0%'] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        />
                    </div>
                </motion.div>

                {/* Messaging */}
                <div className="text-center space-y-4">
                    <motion.h1
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="text-4xl font-black text-slate-900 tracking-tight uppercase"
                    >
                        Connection Severed
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="text-slate-500 font-medium leading-relaxed max-w-sm mx-auto font-mono text-xs"
                    >
                        {isOnline
                            ? "> Quantum link failed. Nexus Core timeout at Layer 7."
                            : "> Local uplink offline. Verify physical hardware connection."}
                    </motion.p>
                </div>

                {/* Terminal Button */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="flex flex-col items-center gap-8"
                >
                    <button
                        onClick={handleRetry}
                        className="group relative px-10 py-4 bg-slate-900 text-white rounded-xl font-mono text-[10px] tracking-[0.2em] uppercase transition-all hover:scale-105 active:scale-95 shadow-2xl border border-indigo-500/30"
                    >
                        <span className="relative z-10 flex items-center gap-3">
                            <Terminal size={12} className="text-indigo-400" />
                            RUN NEXUS_RECOVER.SH
                        </span>

                        {/* Glow effect */}
                        <div className="absolute inset-0 rounded-xl bg-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity blur-xl shadow-[0_0_15px_rgba(79,70,229,0.3)]" />
                    </button>

                    <div className="flex flex-col items-center gap-3 opacity-30 group-hover:opacity-60 transition-opacity duration-500">
                        <div className="flex items-center gap-6">
                            <a href="/status" className="group flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-indigo-600 transition-colors">
                                VIEW_UPTIME
                                <ExternalLink size={10} />
                            </a>
                            <div className="w-1 h-1 bg-slate-400 rounded-full" />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">OVERSIGHT_ELITE_v2</span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </StatusOverlay>
    )
}
