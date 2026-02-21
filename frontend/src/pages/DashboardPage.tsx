import { useState, useEffect, useCallback } from 'react'
import { LogOut, RefreshCw, Zap, CreditCard, TrendingUp, CheckCircle2, XCircle, Clock, Activity, Settings, Code2, BarChart3 } from 'lucide-react'
import clsx from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../lib/api'
import CheckoutModal from '../components/CheckoutModal'
import NexusBackground from '../components/NexusBackground'
import SettingsPage from './SettingsPage'
import IntegrationPage from './IntegrationPage'
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

type Tab = 'payments' | 'settings' | 'integration'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'payments', label: 'Payments', icon: <CreditCard size={15} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={15} /> },
    { id: 'integration', label: 'Integration', icon: <Code2 size={15} /> },
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
        <span className="inline-flex items-center gap-1.5 text-xs font-medium">
            <span className={clsx('w-2 h-2 rounded-full', GATEWAY_COLORS[gateway] || 'bg-slate-400')} />
            <span className="capitalize">{gateway}</span>
        </span>
    )
}

type Props = { session: Session; onLogout: () => void }

export default function DashboardPage({ session, onLogout }: Props) {
    const { configs: _configs, rules: _rules, loading: _configsLoading } = useMerchant()
    const [intents, setIntents] = useState<PaymentIntent[]>([])
    const [loading, setLoading] = useState(true)
    const [showCheckout, setShowCheckout] = useState(false)
    const [activeTab, setActiveTab] = useState<Tab>('payments')

    const fetchIntents = useCallback(async () => {
        setLoading(true)
        try {
            const { data } = await api.get('/payments/')
            setIntents(data)
        } catch {
            // silently handle — user will see empty table
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchIntents() }, [fetchIntents])

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

    const stats = {
        total: intents.length,
        succeeded: intents.filter(i => i.status === 'succeeded').length,
        failed: intents.filter(i => i.status === 'failed').length,
        volume: intents.filter(i => i.status === 'succeeded').reduce((s, i) => s + i.amount, 0),
    }

    // Gateway volume breakdown
    const gatewayVolume = intents
        .filter(i => i.status === 'succeeded' && i.gateway_used)
        .reduce<Record<string, number>>((acc, i) => {
            acc[i.gateway_used!] = (acc[i.gateway_used!] || 0) + i.amount
            return acc
        }, {})
    const totalGwVolume = Object.values(gatewayVolume).reduce((a, b) => a + b, 0) || 1

    return (
        <NexusBackground active={showCheckout} tab={activeTab}>
            {/* Branding Anchor */}
            <div className="fixed left-6 top-1/2 -translate-y-1/2 -rotate-90 origin-left pointer-events-none select-none hidden 2xl:block">
                <span className="text-[10px] font-black tracking-[0.4em] text-slate-300 opacity-40 uppercase">
                    NEXUS GATEWAY V2.0 // ORCHESTRATION_ENGINE
                </span>
            </div>

            <div className="min-h-screen">
                {/* Top Nav */}
                <header className="bg-white border-b border-slate-200">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="bg-indigo-600 text-white p-1.5 rounded-lg" style={{ minWidth: '30px', minHeight: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Zap size={18} />
                            </div>
                            <span className="font-bold text-slate-900">Nexus Gateway</span>
                            <span className="hidden sm:inline text-slate-300 mx-1">|</span>
                            <span className="hidden sm:inline text-sm text-slate-500">{session.merchantName}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="hidden sm:flex items-center gap-1.5 bg-slate-100 text-slate-500 text-xs font-mono px-3 py-1.5 rounded-lg">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
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
                            {TABS.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={clsx(
                                        'relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition shrink-0 min-h-[44px]',
                                        activeTab === tab.id ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-800'
                                    )}
                                >
                                    {tab.icon}
                                    {tab.label}
                                    {activeTab === tab.id && (
                                        <motion.div
                                            layoutId="activeTab"
                                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"
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
                            {/* ── Payments Tab ────────────────────────────── */}
                            {activeTab === 'payments' && (
                                <>
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
                                                                    <span className="text-xs font-medium capitalize text-slate-700 flex items-center gap-1.5">
                                                                        <span className={clsx('w-2.5 h-2.5 rounded-full', GATEWAY_COLORS[gw] || 'bg-slate-400')} />
                                                                        {gw}
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
                                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                        <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div>
                                                <h2 className="text-sm sm:text-base font-semibold text-slate-900">Payment Intents</h2>
                                                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">All transactions for your account</p>
                                            </div>
                                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                                <button
                                                    onClick={fetchIntents}
                                                    className="p-2.5 border border-slate-100 sm:border-none text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition flex-1 sm:flex-none justify-center min-h-[44px] min-w-[44px] flex items-center"
                                                    title="Refresh"
                                                >
                                                    <RefreshCw size={16} className={clsx(loading && 'animate-spin')} />
                                                </button>
                                                <button
                                                    onClick={() => setShowCheckout(true)}
                                                    className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold min-h-[44px] px-5 rounded-xl transition flex-[4] sm:flex-none shadow-lg shadow-indigo-100"
                                                >
                                                    <CreditCard size={15} />
                                                    New Payment
                                                </button>
                                            </div>
                                        </div>

                                        {loading ? (
                                            <PaymentSkeleton />
                                        ) : intents.length === 0 ? (
                                            <div className="text-center py-20 px-6">
                                                <CreditCard size={36} className="text-slate-200 mx-auto mb-3" />
                                                <p className="text-slate-500 text-sm font-medium">No payments yet</p>
                                                <p className="text-slate-400 text-xs mt-1">Click "New Payment" to simulate a checkout</p>
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto custom-scrollbar">
                                                <table className="w-full text-sm min-w-[640px] sm:min-w-0">
                                                    <thead>
                                                        <tr className="border-b border-slate-100 bg-slate-50/60">
                                                            <th className="text-left text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest px-4 sm:px-6 py-4">ID</th>
                                                            <th className="text-left text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest px-4 sm:px-6 py-4">Amount</th>
                                                            <th className="text-left text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest px-4 sm:px-6 py-4 hidden sm:table-cell">Currency</th>
                                                            <th className="text-left text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest px-4 sm:px-6 py-4">Gateway</th>
                                                            <th className="text-left text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest px-4 sm:px-6 py-4">Status</th>
                                                            <th className="text-left text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest px-4 sm:px-6 py-4 hidden md:table-cell">Idem. Key</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {intents.map(i => (
                                                            <tr key={i.payment_intent_id} className="hover:bg-slate-50 transition-colors">
                                                                <td className="px-4 sm:px-6 py-4 font-mono text-[11px] text-slate-600">
                                                                    {i.payment_intent_id.slice(0, 8)}…
                                                                </td>
                                                                <td className="px-4 sm:px-6 py-4 font-bold text-slate-900 tabular-nums">
                                                                    {fmt(i.amount, i.currency)}
                                                                </td>
                                                                <td className="px-4 sm:px-6 py-4 text-slate-500 uppercase font-medium hidden sm:table-cell">
                                                                    {i.currency}
                                                                </td>
                                                                <td className="px-4 sm:px-6 py-4">
                                                                    <GatewayBadge gateway={i.gateway_used} />
                                                                </td>
                                                                <td className="px-4 sm:px-6 py-4">
                                                                    <StatusBadge status={i.status} />
                                                                </td>
                                                                <td className="px-4 sm:px-6 py-4 font-mono text-[10px] text-slate-400 truncate max-w-[120px] hidden md:table-cell">
                                                                    {i.idempotency_key}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            {/* ── Settings Tab ────────────────────────────── */}
                            {activeTab === 'settings' && <SettingsPage session={session} />}

                            {/* ── Integration Tab ─────────────────────────── */}
                            {activeTab === 'integration' && <IntegrationPage apiKey={session.apiKey} />}
                        </motion.div>
                    </AnimatePresence>
                </main>

                {showCheckout && (
                    <CheckoutModal
                        onClose={() => setShowCheckout(false)}
                        onComplete={handleCheckoutComplete}
                    />
                )}
            </div>
        </NexusBackground>
    )
}
