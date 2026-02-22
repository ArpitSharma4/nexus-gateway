import { useState, useEffect, useCallback } from 'react'
import { LogOut, RefreshCw, CreditCard, TrendingUp, CheckCircle2, XCircle, X, Clock, Activity, Settings, Code2, BarChart3, Info, ChevronRight, ChevronLeft, ShieldAlert, Zap } from 'lucide-react'
import clsx from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../lib/api'
import { toTitleCase } from '../lib/format'
import CheckoutModal from '../components/CheckoutModal'
import NexusBackground from '../components/NexusBackground'
import SettingsPage from './SettingsPage'
import IntegrationPage from './IntegrationPage'
import AdminDashboard from '../components/AdminDashboard'
import { PaymentSkeleton } from '../components/Skeleton'
import type { Session } from '../App'
import { useMerchant } from '../contexts/MerchantContext'
type PaymentIntent = {
    payment_intent_id: string
    amount: number
    currency: string
    status: string
    idempotency_key: string
    gateway_used: string | null
}

type Tab = 'payments' | 'settings' | 'integration' | 'oversight'

const TABS: { id: Tab; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { id: 'payments', label: 'Payments', icon: <CreditCard size={14} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={14} /> },
    { id: 'integration', label: 'Integration', icon: <Code2 size={14} /> },
    { id: 'oversight', label: 'Oversight', icon: <ShieldAlert size={14} />, adminOnly: true },
]

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    created: { label: 'Created', color: 'bg-slate-100 text-slate-600', icon: <Clock size={12} /> },
    pending: { label: 'Pending', color: 'bg-amber-50 text-amber-700', icon: <Clock size={12} /> },
    processing: { label: 'Processing', color: 'bg-blue-50 text-blue-700', icon: <Activity size={12} /> },
    succeeded: { label: 'Succeeded', color: 'bg-emerald-50 text-emerald-700', icon: <CheckCircle2 size={12} /> },
    failed: { label: 'Failed', color: 'bg-red-50 text-red-600', icon: <XCircle size={12} /> },
    cancelled: { label: 'Cancelled', color: 'bg-slate-100 text-slate-500', icon: <XCircle size={12} /> },
}

const GATEWAY_COLORS: Record<string, string> = {
    stripe: 'bg-violet-500',
    razorpay: 'bg-blue-500',
    simulator: 'bg-emerald-500',
}

function fmt(amount: number, currency: string) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, minimumFractionDigits: 2 })
        .format(amount / 100)
}

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status] ?? { label: status, color: 'bg-slate-100 text-slate-600', icon: null }
    return (
        <span className={clsx('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full', cfg.color)}>
            {cfg.icon}{cfg.label}
        </span>
    )
}

function GatewayBadge({ gateway }: { gateway: string | null }) {
    if (!gateway) return <span className="text-xs text-slate-300">—</span>
    return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-tight text-slate-900">
            <span className={clsx('w-2 h-2 rounded-full', GATEWAY_COLORS[gateway] || 'bg-slate-400')} />
            {toTitleCase(gateway)}
        </span>
    )
}

type Props = {
    session: Session;
    onLogout: () => void;
    onNavigateLegal: () => void;
}

export default function DashboardPage({ session, onLogout, onNavigateLegal }: Props) {
    const { configs: _configs, rules: _rules, loading: _configsLoading } = useMerchant()
    const [intents, setIntents] = useState<PaymentIntent[]>([])
    const [loading, setLoading] = useState(true)
    const [totalCount, setTotalCount] = useState(0)
    const [currentPage, setCurrentPage] = useState(1)
    const [filterConfig, setFilterConfig] = useState<{ sort: string; status: string }>({ sort: 'none', status: 'all' })
    const [stats, setStats] = useState<{ total: number; succeeded: number; failed: number; volume: number; gatewayBreakdown: Record<string, number> }>({
        total: 0,
        succeeded: 0,
        failed: 0,
        volume: 0,
        gatewayBreakdown: {}
    })
    const resultsPerPage = 10

    const [showCheckout, setShowCheckout] = useState(false)
    const [activeTab, setActiveTab] = useState<Tab>(session.isAdmin ? 'oversight' : 'payments')
    const [showGuide, setShowGuide] = useState(() => {
        return localStorage.getItem('nexus_guide_dismissed') !== 'true'
    })
    const [announcement, setAnnouncement] = useState<{ content: string; severity: string } | null>(null)
    const [isDismissed, setIsDismissed] = useState(false)

    const dismissGuide = () => {
        localStorage.setItem('nexus_guide_dismissed', 'true')
        setShowGuide(false)
    }

    const handleDismissBanner = () => {
        if (announcement) {
            localStorage.setItem('nexus_announcement_dismissed', announcement.content)
            setIsDismissed(true)
        }
    }

    useEffect(() => {
        if (announcement) {
            const dismissed = localStorage.getItem('nexus_announcement_dismissed')
            setIsDismissed(dismissed === announcement.content)
        }
    }, [announcement])

    const fetchIntents = useCallback(async () => {
        setLoading(true)
        try {
            const { data } = await api.get('/payments/', {
                params: {
                    page: currentPage,
                    limit: resultsPerPage,
                    sort: filterConfig.sort,
                    status: filterConfig.status
                }
            })
            setIntents(data.items)
            setTotalCount(data.total)
            if (data.stats) {
                setStats({
                    total: data.stats.total_all,
                    succeeded: data.stats.total_succeeded,
                    failed: data.stats.total_failed,
                    volume: data.stats.total_volume,
                    gatewayBreakdown: data.stats.gateway_breakdown || {}
                })
            }
        } catch {
            // silently handle — user will see empty table
        } finally {
            setLoading(false)
        }
    }, [currentPage, filterConfig])

    const fetchAnnouncement = useCallback(async () => {
        try {
            const { data } = await api.get('/merchants/announcement')
            setAnnouncement(data)
        } catch {
            // silently handle
        }
    }, [])

    useEffect(() => {
        fetchIntents()
    }, [fetchIntents])

    useEffect(() => {
        fetchAnnouncement()
    }, [fetchAnnouncement])

    const handleCheckoutComplete = (result: any) => {
        // Optimistic Update: Add the new transaction immediately to the list
        const newIntent: PaymentIntent = {
            payment_intent_id: result.payment_intent_id,
            amount: result.amount,
            currency: result.currency,
            status: result.status,
            idempotency_key: result.idempotency_key || 'Simulation',
            gateway_used: result.gateway_used
        }

        setIntents(prev => [newIntent, ...prev])
        setShowCheckout(false)

        // Background refresh to ensure sync with server
        setTimeout(fetchIntents, 2000)
    }

    // Gateway volume breakdown (Server-side aggregated)
    const gatewayVolume = stats.gatewayBreakdown
    const totalGwVolume = Object.values(gatewayVolume).reduce((a, b) => a + (b as number), 0) || 1

    return (
        <NexusBackground active={showCheckout} tab={activeTab}>
            {/* Branding Anchor */}
            <div className="fixed left-6 top-1/2 -translate-y-1/2 -rotate-90 origin-left pointer-events-none select-none hidden 2xl:block">
                <span className="text-[10px] font-black tracking-[0.4em] text-slate-300 opacity-40 uppercase">
                    NEXUS LAYER V2.0 // ORCHESTRATION_ENGINE
                </span>
            </div>

            <div className="min-h-screen">
                {/* Top Nav */}
                <header className="bg-white border-b border-slate-200">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 text-white p-1.5 rounded-lg shadow-lg shadow-indigo-100 flex items-center justify-center" style={{ minWidth: '32px', minHeight: '32px' }}>
                                <Zap size={18} fill="currentColor" />
                            </div>
                            <span className="font-bold text-slate-900">Nexus Layer</span>
                            <span className="hidden sm:inline text-slate-300 mx-1">|</span>
                            <span className={clsx("hidden sm:inline text-sm font-medium", session.isAdmin ? "text-amber-600" : "text-slate-500")}>
                                {session.isAdmin ? "Master Controller" : session.merchantName}
                            </span>
                            {session.isAdmin && (
                                <span className="px-2 py-0.5 bg-slate-900 text-amber-400 text-[10px] font-bold tracking-tight uppercase rounded border border-amber-400/30">
                                    ADMIN LEVEL
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <div className={clsx(
                                "hidden sm:flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-lg border transition-all duration-500",
                                session.isAdmin
                                    ? "bg-amber-400 text-slate-900 border-amber-500 shadow-[0_0_20px_rgba(251,191,36,0.3)] animate-pulse"
                                    : "bg-slate-100 text-slate-500 border-slate-200"
                            )}>
                                <span className={clsx("w-1.5 h-1.5 rounded-full", session.isAdmin ? "bg-slate-900" : "bg-emerald-500 animate-pulse")} />
                                {session.apiKey.slice(0, 18)}…
                            </div>
                            <button
                                onClick={onLogout}
                                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition min-h-[44px] px-2"
                            >
                                <LogOut size={16} />
                                <span className="hidden sm:inline">Logout</span>
                            </button>
                        </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <nav className="flex gap-1 -mb-px overflow-x-auto no-scrollbar whitespace-nowrap">
                            {TABS.filter(t => !t.adminOnly || session.isAdmin).map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={clsx(
                                        'relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition shrink-0 min-h-[44px]',
                                        activeTab === tab.id
                                            ? (session.isAdmin ? 'text-amber-600' : 'text-indigo-600')
                                            : 'text-slate-500 hover:text-slate-800'
                                    )}
                                >
                                    {tab.icon}
                                    {tab.label}
                                    {activeTab === tab.id && (
                                        <motion.div
                                            layoutId="activeTab"
                                            className={clsx("absolute bottom-0 left-0 right-0 h-0.5", session.isAdmin ? "bg-amber-500" : "bg-indigo-600")}
                                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                        />
                                    )}
                                </button>
                            ))}
                        </nav>
                    </div>
                </header>

                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 overflow-hidden">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -20, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            className="space-y-6"
                        >
                            {/* Global Platform Announcement Banner */}
                            <AnimatePresence>
                                {announcement && announcement.content && !isDismissed && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="mb-6 overflow-hidden"
                                    >
                                        <div className={clsx(
                                            "flex items-center gap-3 p-4 rounded-2xl border backdrop-blur-md",
                                            announcement.severity === 'critical'
                                                ? "bg-red-50/80 border-red-200 text-red-800"
                                                : "bg-amber-50/80 border-amber-200 text-amber-800"
                                        )}>
                                            <div className={clsx(
                                                "p-1.5 rounded-lg",
                                                announcement.severity === 'critical' ? "bg-red-100" : "bg-amber-100"
                                            )}>
                                                <Info size={16} />
                                            </div>
                                            <div className="flex-1 text-sm font-bold tracking-tight">
                                                <span className="uppercase text-[10px] opacity-60 mr-2">Platform Update:</span>
                                                {announcement.content}
                                            </div>
                                            <div className="flex items-center gap-4">
                                                {session.isAdmin && (
                                                    <button
                                                        onClick={async () => {
                                                            await api.post('/admin/broadcast', { content: '', severity: '' }, { headers: { 'X-Admin-Key': session.apiKey } })
                                                            setAnnouncement(null)
                                                        }}
                                                        className="text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 bg-slate-200/50 px-2 py-1 rounded-md"
                                                    >
                                                        Clear
                                                    </button>
                                                )}
                                                <button
                                                    onClick={handleDismissBanner}
                                                    className="p-1 rounded-full hover:bg-slate-200/50 text-slate-400 hover:text-slate-600 transition-colors"
                                                    title="Dismiss"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* ── Payments Tab ────────────────────────────── */}
                            {activeTab === 'payments' && (
                                <>
                                    {/* Quick Start Guide */}
                                    <AnimatePresence>
                                        {showGuide && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                                                animate={{ height: 'auto', opacity: 1, marginBottom: 24 }}
                                                exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="bg-white/40 backdrop-blur-xl rounded-[24px] border border-white/40 p-6 relative group overflow-hidden shadow-xl shadow-indigo-500/5">
                                                    {/* Decorative background glow */}
                                                    <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full" />

                                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                                                        <div className="space-y-1.5 flex-1">
                                                            <div className="flex items-center gap-2 text-indigo-600 mb-2">
                                                                <div className="bg-indigo-50 p-1.5 rounded-lg border border-indigo-100">
                                                                    <Info size={16} />
                                                                </div>
                                                                <span className="text-sm font-black tracking-widest uppercase">Nexus Quick-Start Manual</span>
                                                            </div>
                                                            <h3 className="text-xl font-black text-slate-900 tracking-tight italic">Welcome to the future of orchestration.</h3>
                                                            <p className="text-xs text-slate-500 font-medium max-w-lg leading-relaxed">
                                                                Follow these three steps to transition from local simulation to global production-ready payments.
                                                            </p>
                                                        </div>

                                                        <button
                                                            onClick={dismissGuide}
                                                            className="text-slate-400 hover:text-slate-900 text-[11px] font-black tracking-widest uppercase py-2 px-4 border border-slate-200 rounded-xl hover:bg-white/80 transition shadow-sm"
                                                        >
                                                            DISMISS MANUAL
                                                        </button>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 relative z-10">
                                                        {[
                                                            { step: '01', title: 'Authenticate', desc: 'Add your Stripe/Razorpay keys in the Settings tab to initialize real connections.', tab: 'settings' as Tab },
                                                            { step: '02', title: 'Set Rules', desc: 'Define logic to route payments by currency or amount for optimal success rates.', tab: 'settings' as Tab },
                                                            { step: '03', title: 'Test Failover', desc: 'Use the Simulator to watch the engine handle edge cases and routing in real-time.', tab: 'payments' as Tab },
                                                        ].map((s) => (
                                                            <button
                                                                key={s.step}
                                                                onClick={() => setActiveTab(s.tab)}
                                                                className="flex items-start gap-4 p-4 rounded-2xl bg-white/40 border border-white/60 hover:border-indigo-200 hover:bg-white/80 transition-all text-left group/step"
                                                            >
                                                                <span className="text-2xl font-black text-indigo-100 group-hover/step:text-indigo-200 transition-colors tabular-nums mt-1">{s.step}</span>
                                                                <div className="space-y-1">
                                                                    <div className="flex items-center gap-1.5 font-bold text-slate-900 group-hover/step:text-indigo-600 transition-colors">
                                                                        {s.title}
                                                                        <ChevronRight size={14} className="opacity-0 -translate-x-2 group-hover/step:opacity-100 group-hover/step:translate-x-0 transition-all" />
                                                                    </div>
                                                                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{s.desc}</p>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Stats */}
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                                        {[
                                            { label: 'Total Intents', value: stats.total, icon: <CreditCard size={18} className="text-indigo-500" />, color: 'text-slate-900' },
                                            { label: 'Succeeded', value: stats.succeeded, icon: <CheckCircle2 size={18} className="text-emerald-500" />, color: 'text-emerald-600' },
                                            { label: 'Failed', value: stats.failed, icon: <XCircle size={18} className="text-red-400" />, color: 'text-red-500' },
                                            { label: 'Total Volume', value: fmt(stats.volume, 'INR'), icon: <TrendingUp size={18} className="text-indigo-500" />, color: 'text-slate-900' },
                                        ].map(s => (
                                            <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
                                                <div className="flex items-center justify-between mb-2 sm:mb-3">
                                                    <span className="text-[11px] sm:text-sm text-slate-500 font-medium">{s.label}</span>
                                                    <span className="opacity-80 scale-90 sm:scale-100">{s.icon}</span>
                                                </div>
                                                <div className={clsx('text-lg sm:text-2xl font-bold tabular-nums truncate', s.color)}>{s.value}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Volume by Gateway */}
                                    {Object.keys(gatewayVolume).length > 0 && (
                                        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
                                            <div className="flex items-center gap-2 mb-4">
                                                <BarChart3 size={16} className="text-indigo-500" />
                                                <span className="text-sm font-semibold text-slate-900">Volume by Gateway</span>
                                            </div>
                                            <div className="space-y-4">
                                                {Object.entries(gatewayVolume)
                                                    .sort((a, b) => b[1] - a[1])
                                                    .map(([gw, vol]) => {
                                                        const pct = (vol / totalGwVolume) * 100
                                                        return (
                                                            <div key={gw} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                                                                <div className="flex items-center justify-between sm:w-28">
                                                                    <span className="text-xs font-semibold tracking-tight text-slate-900 flex items-center gap-1.5">
                                                                        <span className={clsx('w-2.5 h-2.5 rounded-full', GATEWAY_COLORS[gw] || 'bg-slate-400')} />
                                                                        {toTitleCase(gw)}
                                                                    </span>
                                                                    <span className="sm:hidden text-[10px] text-slate-400 font-mono">{fmt(vol, 'INR')}</span>
                                                                </div>
                                                                <div className="flex-1 flex items-center gap-3">
                                                                    <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                                                                        <div
                                                                            className={clsx('h-full rounded-full transition-all duration-700', GATEWAY_COLORS[gw] || 'bg-slate-400')}
                                                                            style={{ width: `${pct}%` }}
                                                                        />
                                                                    </div>
                                                                    <span className="hidden sm:inline-block text-xs font-mono text-slate-500 tabular-nums w-20 text-right">
                                                                        {fmt(vol, 'INR')}
                                                                    </span>
                                                                    <span className="text-[10px] text-slate-400 w-8 text-right font-medium">{pct.toFixed(0)}%</span>
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Table card */}
                                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
                                        <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/50 backdrop-blur-sm">
                                            <div>
                                                <h2 className="text-sm sm:text-base font-semibold text-slate-900">Payment Intents</h2>
                                                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">All transactions for your account</p>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                {/* Amount Sort */}
                                                <select
                                                    value={filterConfig.sort}
                                                    onChange={(e) => {
                                                        setFilterConfig(prev => ({ ...prev, sort: e.target.value }))
                                                        setCurrentPage(1)
                                                    }}
                                                    className="text-[11px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                >
                                                    <option value="none">Sort: Newest</option>
                                                    <option value="highest">Highest Amount</option>
                                                    <option value="lowest">Lowest Amount</option>
                                                </select>

                                                {/* Status Filter */}
                                                <select
                                                    value={filterConfig.status}
                                                    onChange={(e) => {
                                                        setFilterConfig(prev => ({ ...prev, status: e.target.value }))
                                                        setCurrentPage(1)
                                                    }}
                                                    className="text-[11px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                >
                                                    <option value="all">All Statuses</option>
                                                    <option value="succeeded">Succeeded</option>
                                                    <option value="failed">Failed</option>
                                                </select>

                                                <div className="h-4 w-[1px] bg-slate-200 mx-1 hidden sm:block" />

                                                <button
                                                    onClick={fetchIntents}
                                                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                                                    title="Refresh"
                                                >
                                                    <RefreshCw size={14} className={clsx(loading && 'animate-spin')} />
                                                </button>
                                                <button
                                                    onClick={() => setShowCheckout(true)}
                                                    className="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg transition shadow-sm"
                                                >
                                                    <CreditCard size={12} />
                                                    Charge
                                                </button>
                                            </div>
                                        </div>

                                        {loading ? (
                                            <div className="p-4 space-y-3">
                                                {[...Array(5)].map((_, i) => <PaymentSkeleton key={i} />)}
                                            </div>
                                        ) : intents.length === 0 ? (
                                            <div className="text-center py-20 px-6 bg-slate-50/20">
                                                <div className="bg-slate-100 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                                    <CreditCard size={20} className="text-slate-400" />
                                                </div>
                                                <p className="text-slate-900 text-sm font-bold">
                                                    {filterConfig.status === 'all' ? "No payments yet" : `No ${filterConfig.status} payments`}
                                                </p>
                                                <p className="text-slate-500 text-[11px] mt-1 font-medium">
                                                    {filterConfig.status === 'all'
                                                        ? "Your transaction history will appear here once you start processing."
                                                        : "Try adjusting your filters to see more results."}
                                                </p>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left border-collapse">
                                                        <thead>
                                                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                                                <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-400">Intent ID</th>
                                                                <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-400">Amount</th>
                                                                <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-400">Gateway</th>
                                                                <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-50">
                                                            {intents.map((i) => (
                                                                <tr key={i.payment_intent_id} className="hover:bg-slate-50/50 transition-colors group">
                                                                    <td className="px-6 py-4">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="font-mono text-[11px] font-bold text-slate-400 group-hover:text-indigo-600 transition-colors">
                                                                                {i.payment_intent_id.slice(0, 12)}...
                                                                            </span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-6 py-4">
                                                                        <span className="text-xs font-bold text-slate-900 tabular-nums">
                                                                            {fmt(i.amount, i.currency)}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-6 py-4">
                                                                        <GatewayBadge gateway={i.gateway_used} />
                                                                    </td>
                                                                    <td className="px-6 py-4">
                                                                        <StatusBadge status={i.status} />
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>

                                                {/* Pagination Controls */}
                                                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between">
                                                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                                        Page <span className="text-slate-900">{currentPage}</span> of <span className="text-slate-900">{Math.ceil(totalCount / resultsPerPage) || 1}</span>
                                                        <span className="ml-3 opacity-50 font-medium">({totalCount} Total)</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            disabled={currentPage === 1 || loading}
                                                            onClick={() => setCurrentPage(p => p - 1)}
                                                            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-slate-900 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm"
                                                            title="Previous Page"
                                                        >
                                                            <ChevronLeft size={16} />
                                                        </button>
                                                        <button
                                                            disabled={currentPage >= Math.ceil(totalCount / resultsPerPage) || loading}
                                                            onClick={() => setCurrentPage(p => p + 1)}
                                                            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-slate-900 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm"
                                                            title="Next Page"
                                                        >
                                                            <ChevronRight size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </>
                            )}

                            {/* ── Settings Tab ────────────────────────────── */}
                            {activeTab === 'settings' && <SettingsPage session={session} onNavigateLegal={onNavigateLegal} />}

                            {/* ── Integration Tab ─────────────────────────── */}
                            {activeTab === 'integration' && <IntegrationPage apiKey={session.apiKey} />}

                            {/* ── Oversight Tab (Admin Only) ───────────────── */}
                            {activeTab === 'oversight' && session.isAdmin && <AdminDashboard apiKey={session.apiKey} />}
                        </motion.div>
                    </AnimatePresence>
                </main>

                {showCheckout && (
                    <CheckoutModal
                        onClose={() => setShowCheckout(false)}
                        onComplete={handleCheckoutComplete}
                        onNavigateLegal={onNavigateLegal}
                    />
                )}
            </div>
        </NexusBackground>
    )
}
