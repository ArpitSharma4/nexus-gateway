import { useState, useEffect } from 'react'
import { Users, BarChart3, Activity, ShieldAlert, Zap, ArrowUpRight, CheckCircle2, RotateCw, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import { createClient } from '@supabase/supabase-js'
import api from '../lib/api'
import { StripeLogo, RazorpayLogo, SimulatorLogo } from './GatewayLogos'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

type Metrics = {
    total_merchants: number
    total_volume: number
    rescued_revenue: number
    failover_rate: number
    total_transactions: number
    gateway_race: Record<string, {
        success_rate: number
        avg_latency: number
        latency_history: number[]
        error_rate: number
        is_outage: boolean
    }>
}

type SystemEvent = {
    id: number
    event_type: string
    message: string
    timestamp: string
}

type Props = {
    apiKey: string
}

function timeAgo(date: string) {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000)
    if (seconds < 60) return 'Just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return new Date(date).toLocaleDateString()
}

const EVENT_CONFIG: Record<string, { icon: any; color: string; pulse: string }> = {
    MERCHANT_JOIN: { icon: Sparkles, color: 'text-blue-500', pulse: 'bg-blue-500' },
    FAILOVER_RESCUE: { icon: RotateCw, color: 'text-amber-500', pulse: 'bg-amber-500' },
    UPTIME_CHECK: { icon: CheckCircle2, color: 'text-emerald-500', pulse: 'bg-emerald-500' },
    DEFAULT: { icon: Activity, color: 'text-slate-400', pulse: 'bg-slate-400' }
}

export default function AdminDashboard({ apiKey }: Props) {
    const [metrics, setMetrics] = useState<Metrics | null>(null)
    const [events, setEvents] = useState<SystemEvent[]>([])
    const [loading, setLoading] = useState(true)
    const [broadcastContent, setBroadcastContent] = useState('')
    const [isBroadcasting, setIsBroadcasting] = useState(false)
    const [_, setTick] = useState(0)

    useEffect(() => {
        fetchMetrics()
        fetchEvents()

        // Subscription for real-time events
        const channel = supabase
            .channel('system_events_realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'system_events' }, payload => {
                const newEvent = payload.new as SystemEvent
                setEvents(prev => [newEvent, ...prev].slice(0, 50))
            })
            .subscribe()

        const metricsTimer = setInterval(fetchMetrics, 30000)
        const pulseTimer = setInterval(() => setTick(t => t + 1), 60000) // Re-render for relative time

        return () => {
            supabase.removeChannel(channel)
            clearInterval(metricsTimer)
            clearInterval(pulseTimer)
        }
    }, [])

    async function fetchMetrics() {
        try {
            const { data } = await api.get('/admin/metrics', {
                headers: { 'X-Admin-Key': apiKey }
            })
            setMetrics(data)
        } catch (err) {
            console.error("Failed to fetch admin metrics", err)
        } finally {
            setLoading(false)
        }
    }

    async function fetchEvents() {
        try {
            const { data } = await api.get('/admin/events', {
                headers: { 'X-Admin-Key': apiKey }
            })
            setEvents(data)
        } catch (err) {
            console.error("Failed to fetch events", err)
        }
    }

    async function toggleChaos(gateway: string, currentStatus: boolean) {
        try {
            await api.post('/admin/gateway/toggle',
                { gateway_id: gateway, status: currentStatus ? 'operational' : 'down' },
                { headers: { 'X-Admin-Key': apiKey } }
            )
            fetchMetrics() // Refresh to show updated outage status
            fetchEvents()  // Refresh to show manual kill event
        } catch (err) {
            console.error("Failed to toggle chaos", err)
        }
    }

    async function handleBroadcast() {
        if (!broadcastContent.trim()) return
        setIsBroadcasting(true)
        try {
            await api.post('/admin/broadcast',
                { content: broadcastContent.trim(), severity: 'warning' },
                { headers: { 'X-Admin-Key': apiKey } }
            )
            setBroadcastContent('')
            alert("Broadcast sent successfully!")
        } catch (err) {
            console.error("Failed to broadcast", err)
        } finally {
            setIsBroadcasting(false)
        }
    }

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
        </div>
    )

    return (
        <div className="space-y-6 relative">
            {/* Admin Glow Overlay */}
            <div className="absolute -top-20 -left-20 w-80 h-80 bg-amber-400/10 blur-[100px] pointer-events-none rounded-full" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/5 blur-[80px] pointer-events-none rounded-full" />

            {/* Header */}
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-xl shadow-lg shadow-amber-500/20">
                            <ShieldAlert size={20} className="text-white" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight italic">Oversight Elite</h2>
                    </div>
                    <p className="text-sm text-slate-500 font-medium">Global platform intelligence & master controls.</p>
                </div>

                <div className="bg-white/40 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/60 flex items-center gap-2 overflow-hidden max-w-sm">
                    <input
                        type="text"
                        value={broadcastContent}
                        onChange={(e) => setBroadcastContent(e.target.value)}
                        placeholder="Enter system announcement..."
                        className="bg-transparent text-[11px] font-mono text-slate-600 outline-none px-3 w-48"
                    />
                    <button
                        onClick={handleBroadcast}
                        disabled={isBroadcasting}
                        className="bg-slate-900 text-white text-[10px] font-black tracking-widest uppercase px-3 py-2 rounded-xl hover:bg-slate-800 transition disabled:opacity-50"
                    >
                        {isBroadcasting ? 'SENDING...' : 'BROADCAST'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
                {/* Left Column: Stats & Race */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <MetricCard title="Merchants" value={metrics?.total_merchants || 0} icon={Users} color="text-blue-600" bg="bg-blue-50" />
                        <MetricCard title="Volume" value={new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format((metrics?.total_volume || 0) / 100)} icon={BarChart3} color="text-indigo-600" bg="bg-indigo-50" />
                        <MetricCard title="Rescued" value={new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format((metrics?.rescued_revenue || 0) / 100)} icon={Zap} color="text-amber-600" bg="bg-amber-50" />
                        <MetricCard title="Failover" value={`${metrics?.failover_rate || 0}%`} icon={ShieldAlert} color="text-rose-600" bg="bg-rose-50" />
                    </div>

                    {/* Gateway performance Comparison */}
                    <div className="bg-white/80 backdrop-blur-xl rounded-[24px] p-6 border border-slate-200 shadow-xl shadow-slate-200/40">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <Activity size={16} className="text-amber-500" />
                                <h3 className="font-bold text-slate-900">Infrastructure Performance Race</h3>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5 overflow-hidden">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Live Sync</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {['stripe', 'razorpay'].map(gw => {
                                const race = metrics?.gateway_race[gw] || { success_rate: 0, avg_latency: 0, latency_history: [], error_rate: 0, is_outage: false }
                                const isStripe = gw === 'stripe'
                                const Logo = isStripe ? StripeLogo : RazorpayLogo
                                const isOutage = race.is_outage

                                return (
                                    <div key={gw} className={clsx(
                                        "space-y-4 p-5 rounded-2xl border relative group overflow-hidden transition-all duration-500",
                                        isOutage ? "bg-red-50 border-red-200 grayscale blur-[1px]" : "bg-slate-50/50 border-slate-200"
                                    )}>
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className={clsx("p-2 rounded-xl text-white shadow-sm", isOutage ? "bg-red-500 grayscale" : (isStripe ? "bg-[#635BFF]" : "bg-[#3395FF]"))}>
                                                    <Logo className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-900 capitalize">{gw}</h4>
                                                    {isOutage && (
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                                                            <span className="text-[8px] font-black uppercase text-red-600 tracking-widest">OFFLINE</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => toggleChaos(gw, isOutage)}
                                                className={clsx(
                                                    "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                                                    isOutage
                                                        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/30"
                                                        : "bg-red-50 text-red-600 hover:bg-red-100 border border-red-100"
                                                )}
                                            >
                                                {isOutage ? "Revive" : "Kill Node"}
                                            </button>
                                        </div>

                                        <div className="space-y-3">
                                            <div>
                                                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-tight">
                                                    <span>Success Rate</span>
                                                    <span className={clsx("tabular-nums font-mono", isOutage ? "text-red-600" : "text-emerald-600")}>{isOutage ? "0" : race.success_rate}%</span>
                                                </div>
                                                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: isOutage ? '0%' : `${race.success_rate}%` }}
                                                        className={clsx("h-full rounded-full transition-all duration-1000", isOutage ? "bg-red-500" : "bg-emerald-500")}
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex-1 h-8 flex items-end gap-0.5">
                                                    {(race.latency_history || []).map((v: number, i: number) => {
                                                        const h = Math.min(Math.max((v / 400) * 100, 10), 100)
                                                        return (
                                                            <div
                                                                key={i}
                                                                style={{ height: `${h}%` }}
                                                                className={clsx(
                                                                    "flex-1 rounded-t-[2px] transition-all duration-500",
                                                                    isOutage ? "bg-red-200" : (isStripe ? "bg-indigo-200" : "bg-blue-200")
                                                                )}
                                                            />
                                                        )
                                                    })}
                                                </div>
                                                <div className="flex gap-4">
                                                    <div className="text-right">
                                                        <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Latency</div>
                                                        <div className="text-xs font-mono font-bold text-slate-900">{isOutage ? "---" : `${race.avg_latency}ms`}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Errors</div>
                                                        <div className="text-xs font-mono font-bold text-red-500">{isOutage ? "100%" : `${race.error_rate}%`}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Column: System Pulse */}
                <div className="bg-white/80 backdrop-blur-xl rounded-[24px] border border-slate-200/60 shadow-xl shadow-slate-200/40 flex flex-col lg:max-h-[500px] overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/40 backdrop-blur-md z-20">
                        <div className="flex items-center gap-2">
                            <Zap size={14} className="text-indigo-500" />
                            <h3 className="font-bold text-[13px] text-slate-900 uppercase tracking-tight">System Pulse</h3>
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 rounded-full border border-emerald-100">
                            <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest leading-none">Live Stream</span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-0.5 custom-scrollbar-slim">
                        <AnimatePresence initial={false}>
                            {events.length === 0 ? (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex flex-col items-center justify-center h-full text-center p-6 space-y-2 py-20"
                                >
                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                                        <Activity size={16} />
                                    </div>
                                    <p className="text-[10px] font-medium text-slate-400 italic">Awaiting pulse events...</p>
                                </motion.div>
                            ) : (
                                events.map((e, idx) => {
                                    const cfg = EVENT_CONFIG[e.event_type] || EVENT_CONFIG.DEFAULT
                                    const Icon = cfg.icon
                                    const isDifferentType = idx > 0 && events[idx - 1].event_type !== e.event_type

                                    return (
                                        <div key={e.id} className="contents">
                                            {isDifferentType && <div className="h-[1px] bg-slate-100/50 my-2 mx-2" />}
                                            <motion.div
                                                initial={{ x: -10, opacity: 0 }}
                                                animate={{ x: 0, opacity: 1 }}
                                                className="flex gap-3 py-2 px-2 hover:bg-slate-50/50 rounded-lg transition-colors group cursor-default"
                                            >
                                                <span className="text-[10px] font-bold text-slate-400 font-mono shrink-0 w-14 text-right tabular-nums opacity-60 group-hover:opacity-100 transition-opacity">
                                                    {timeAgo(e.timestamp)}
                                                </span>
                                                <div className="flex items-center gap-2 flex-1 overflow-hidden">
                                                    <div className={clsx("shrink-0 relative flex items-center justify-center", cfg.color)}>
                                                        <Icon size={11} className="relative z-10" />
                                                        <span className={clsx("absolute inset-0 rounded-full animate-ping opacity-10", cfg.pulse)} />
                                                    </div>
                                                    <span className="text-slate-700 text-[11px] font-semibold truncate">
                                                        {e.message.replace('New Merchant Onboarded:', 'Merchant:').replace('Failover Triggered:', 'Failover:')}
                                                    </span>
                                                </div>
                                            </motion.div>
                                        </div>
                                    )
                                })
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="p-4 bg-slate-50/30 border-t border-slate-100 rounded-b-[24px]">
                        <div className="flex items-center justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            <span className="flex items-center gap-1.5 text-slate-400">
                                Platforms Nominal
                            </span>
                            <span className="text-[10px] font-mono opacity-50">{events.length} Node Events</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Platform Infrastructure Nodes */}
            <div className="bg-white/80 backdrop-blur-xl rounded-[24px] p-6 border border-slate-200/60 shadow-xl shadow-slate-200/40">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-slate-900">Infrastructure Nodes</h3>
                    <div className="flex items-center gap-2 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold tracking-tight uppercase rounded-lg border border-emerald-100">
                        <Activity size={12} />
                        Systems Nominal
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <GatewayStatus name="Stripe" Logo={StripeLogo} status="Operational" latency="24ms" color="bg-[#635BFF]" />
                    <GatewayStatus name="Razorpay" Logo={RazorpayLogo} status="Operational" latency="182ms" color="bg-[#3395FF]" />
                    <GatewayStatus name="Simulator" Logo={SimulatorLogo} status="Operational" latency="2ms" color="bg-emerald-500" />
                </div>
            </div>
        </div>
    )
}

function MetricCard({ title, value, icon: Icon, color, bg }: any) {
    return (
        <motion.div
            whileHover={{ y: -4 }}
            className="bg-white/90 backdrop-blur-md p-6 rounded-[24px] border border-slate-200/60 shadow-lg shadow-slate-200/30"
        >
            <div className="flex items-center justify-between mb-4">
                <div className={clsx("p-2 rounded-xl", bg, color)}>
                    <Icon size={18} />
                </div>
                <ArrowUpRight size={14} className="text-slate-300" />
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</p>
            <p className="text-2xl font-black text-slate-900">{value}</p>
        </motion.div>
    )
}

function GatewayStatus({ name, Logo, status, latency, color }: any) {
    return (
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center text-white", color)}>
                <Logo className="w-6 h-6" />
            </div>
            <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-slate-900">{name}</span>
                    <span className="text-[10px] font-mono text-slate-400">{latency}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tight">{status}</span>
                </div>
            </div>
        </div>
    )
}
