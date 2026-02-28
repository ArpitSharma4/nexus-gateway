import { motion } from 'framer-motion'
import { Terminal, ShieldAlert } from 'lucide-react'
import StatusOverlay from '../components/StatusOverlay'
import GlitchText from '../components/GlitchText'

export default function ErrorPage() {
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
                    <div className="absolute -inset-8 bg-rose-500/5 blur-3xl rounded-full animate-pulse" />
                    <div className="relative bg-white/10 backdrop-blur-3xl border border-white/20 rounded-[3rem] px-24 py-16 shadow-[0_0_100px_rgba(244,63,94,0.1)] flex flex-col items-center justify-center overflow-hidden">

                        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />

                        <div className="mb-4">
                            <ShieldAlert size={64} className="text-rose-600/80" />
                        </div>

                        <GlitchText
                            text="ERR_CORE"
                            className="text-5xl font-black text-slate-900 tracking-tighter select-none uppercase"
                        />

                        <div className="mt-2 flex items-center gap-2">
                            <div className="w-1 h-1 bg-rose-500 rounded-full animate-ping" />
                            <span className="text-[10px] font-mono font-bold text-rose-500 uppercase tracking-widest">CRITICAL_EXCEPTION</span>
                        </div>

                        {/* Scanner sweep */}
                        <motion.div
                            className="absolute left-0 right-0 h-0.5 bg-rose-500/20 z-10"
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
                        Circuit Broken
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="text-slate-500 font-medium leading-relaxed max-w-sm mx-auto font-mono text-xs"
                    >
                        {"> Panic in primary payment pipeline. Gateway handshake signature mismatch detected."}
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
                        className="group relative px-10 py-4 bg-slate-900 text-white rounded-xl font-mono text-[10px] tracking-[0.2em] uppercase transition-all hover:scale-105 active:scale-95 shadow-2xl border border-rose-500/30"
                    >
                        <span className="relative z-10 flex items-center gap-3">
                            <Terminal size={12} className="text-rose-400" />
                            FORCE NEXUS_RESET.SH
                        </span>

                        <div className="absolute inset-0 rounded-xl bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity blur-xl shadow-[0_0_15px_rgba(244,63,94,0.3)]" />
                    </button>

                    <div className="flex flex-col items-center gap-3 opacity-30 group-hover:opacity-60 transition-opacity duration-500">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">OVERSIGHT_ELITE_v2</span>
                    </div>
                </motion.div>
            </div>
        </StatusOverlay>
    )
}
