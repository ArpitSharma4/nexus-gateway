import { useEffect, useState } from 'react'
import { Database, Server, Activity, Info } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import api from '../lib/api'
import { useMerchant } from '../contexts/MerchantContext'


function HoverTooltip({ content, children }: { content: string; children: React.ReactNode }) {
    const [isHovered, setIsHovered] = useState(false)
    return (
        <div className="relative" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
            {children}
            <AnimatePresence>
                {isHovered && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-48 bg-slate-900 text-white p-3 rounded-2xl text-[10px] shadow-2xl z-50 pointer-events-none border border-slate-800"
                    >
                        <div className="relative z-10 font-medium leading-relaxed">
                            {content}
                        </div>
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-slate-900 border-r border-b border-slate-800" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export default function SystemMonitor() {
    const { configs } = useMerchant()
    const [dbLatency, setDbLatency] = useState<number | null>(null)

    useEffect(() => {
        const fetchPing = async () => {
            const t0 = performance.now()
            try {
                await api.get('/merchants/login').catch(() => { /* ignore */ })
            } catch { /* ignore */ }
            const elapsed = performance.now() - t0
            setDbLatency(Math.round(elapsed))
        }

        fetchPing()
        const interval = setInterval(fetchPing, 15000)
        return () => clearInterval(interval)
    }, [])

    // Determine if any real-world gateway is active and configured
    const realGateways = configs.filter(c => c.gateway_name !== 'simulator')
    const hasActiveRealGateway = realGateways.some(c => c.enabled && c.has_api_key)

    // HUD Labels and Colors
    const gtwyLabel = hasActiveRealGateway ? 'GTWY ACTIVE' : 'SIM MODE'
    const gtwyColor = hasActiveRealGateway
        ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
        : "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]"

    // Latency filtering: Show --ms if no real gateways are active
    const displayLatency = hasActiveRealGateway && dbLatency !== null ? `${dbLatency}ms` : '--ms'

    return (
        <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 z-40 pointer-events-none w-full sm:w-auto px-4 sm:px-0">
            <div className="bg-white/80 backdrop-blur-md rounded-full border border-slate-200/50 px-4 sm:px-5 py-1.5 sm:py-2 flex items-center justify-center sm:justify-start gap-3 sm:gap-4 text-[10px] sm:text-[11px] font-sans tracking-tight pointer-events-auto shadow-lg shadow-slate-200/20 max-w-max mx-auto sm:mx-0">

                {/* Gateway Status */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <span className={clsx("w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full shrink-0", gtwyColor)} />
                    <div className="flex items-center gap-1 sm:gap-1.5 font-bold">
                        <span className="text-slate-400 font-black tracking-tighter capitalize leading-none hidden xs:inline">
                            {gtwyLabel.split(' ')[0]}
                        </span>
                        <span className="text-slate-900 font-black italic uppercase leading-none mt-0.5">
                            {gtwyLabel.split(' ')[1]}
                        </span>
                    </div>
                </div>

                <div className="w-px h-3 bg-slate-200/80" />

                {/* Core Status */}
                <HoverTooltip content="Real-time monitoring of local database health and Vercel serverless function connectivity.">
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 cursor-help">
                        <Database size={12} className="text-slate-400 fill-slate-400/10 sm:scale-110" />
                        <div className="flex items-center gap-1 sm:gap-1.5 font-bold">
                            <span className="text-slate-400 font-black tracking-tighter hidden xs:inline flex items-center gap-1">
                                CORE <Info size={8} />
                            </span>
                            <span className="text-slate-900 font-black italic uppercase leading-none mt-0.5">STABLE</span>
                        </div>
                    </div>
                </HoverTooltip>

                <div className="w-px h-3 bg-slate-200/80" />

                {/* Latency */}
                <HoverTooltip content="Round-trip time (RTT) from your browser to the Nexus Edge. Measures orchestration overhead.">
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 cursor-help">
                        <Server size={12} className="text-slate-400 fill-slate-400/10 sm:scale-110" />
                        <div className="flex items-center gap-1 sm:gap-1.5 font-bold">
                            <span className="text-slate-400 font-black tracking-tighter hidden xs:inline flex items-center gap-1">
                                LAT <Info size={8} />
                            </span>
                            <span className={clsx(
                                "font-black leading-none mt-0.5",
                                hasActiveRealGateway ? "text-emerald-500" : "text-slate-400"
                            )}>
                                {displayLatency}
                            </span>
                        </div>
                    </div>
                </HoverTooltip>

                {/* Engine Version */}
                <div className="hidden md:flex items-center pl-1">
                    <div className="flex items-center gap-1 bg-slate-900/5 px-2 py-0.5 rounded-full border border-slate-950/5">
                        <Activity size={10} className="text-slate-400" />
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">NX_2.0</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
