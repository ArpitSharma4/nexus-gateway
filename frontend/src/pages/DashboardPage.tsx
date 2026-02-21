import { useState, useEffect, useCallback } from 'react'
import { LogOut, RefreshCw, Zap, CreditCard, TrendingUp, CheckCircle2, XCircle, Clock, Activity } from 'lucide-react'
import clsx from 'clsx'
import api from '../lib/api'
import CheckoutModal from '../components/CheckoutModal'
import NexusBackground from '../components/NexusBackground'
import type { Session } from '../App'

type PaymentIntent = {
    payment_intent_id: string
    amount: number
    currency: string
    status: string
    idempotency_key: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    created: { label: 'Created', color: 'bg-slate-100 text-slate-600', icon: <Clock size={12} /> },
    pending: { label: 'Pending', color: 'bg-amber-50 text-amber-700', icon: <Clock size={12} /> },
    processing: { label: 'Processing', color: 'bg-blue-50 text-blue-700', icon: <Activity size={12} /> },
    succeeded: { label: 'Succeeded', color: 'bg-emerald-50 text-emerald-700', icon: <CheckCircle2 size={12} /> },
    failed: { label: 'Failed', color: 'bg-red-50 text-red-600', icon: <XCircle size={12} /> },
    cancelled: { label: 'Cancelled', color: 'bg-slate-100 text-slate-500', icon: <XCircle size={12} /> },
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

type Props = { session: Session; onLogout: () => void }

export default function DashboardPage({ session, onLogout }: Props) {
    const [intents, setIntents] = useState<PaymentIntent[]>([])
    const [loading, setLoading] = useState(true)
    const [showCheckout, setShowCheckout] = useState(false)

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

    const stats = {
        total: intents.length,
        succeeded: intents.filter(i => i.status === 'succeeded').length,
        failed: intents.filter(i => i.status === 'failed').length,
        volume: intents.filter(i => i.status === 'succeeded').reduce((s, i) => s + i.amount, 0),
    }

    function handleLogout() {
        onLogout()
    }

    return (
        <NexusBackground active={showCheckout}>
            {/* Branding Anchor */}
            <div className="fixed left-6 top-1/2 -translate-y-1/2 -rotate-90 origin-left pointer-events-none select-none hidden 2xl:block">
                <span className="text-[10px] font-black tracking-[0.4em] text-slate-300 opacity-40 uppercase">
                    NEXUS GATEWAY V1.0 // SYSTEMS_ACTIVE
                </span>
            </div>

            <div className="min-h-screen">
                {/* Top Nav */}
                <header className="bg-white border-b border-slate-200">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="bg-indigo-600 text-white p-1.5 rounded-lg">
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
                                onClick={handleLogout}
                                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition"
                            >
                                <LogOut size={16} />
                                <span className="hidden sm:inline">Logout</span>
                            </button>
                        </div>
                    </div>
                </header>

                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                    {/* Stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: 'Total Intents', value: stats.total, icon: <CreditCard size={18} className="text-indigo-500" />, color: 'text-slate-900' },
                            { label: 'Succeeded', value: stats.succeeded, icon: <CheckCircle2 size={18} className="text-emerald-500" />, color: 'text-emerald-600' },
                            { label: 'Failed', value: stats.failed, icon: <XCircle size={18} className="text-red-400" />, color: 'text-red-500' },
                            { label: 'Total Volume', value: fmt(stats.volume, 'INR'), icon: <TrendingUp size={18} className="text-indigo-500" />, color: 'text-slate-900' },
                        ].map(s => (
                            <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm text-slate-500">{s.label}</span>
                                    {s.icon}
                                </div>
                                <div className={clsx('text-2xl font-bold tabular-nums', s.color)}>{s.value}</div>
                            </div>
                        ))}
                    </div>

                    {/* Table card */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-base font-semibold text-slate-900">Payment Intents</h2>
                                <p className="text-xs text-slate-500 mt-0.5">All transactions for your account</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={fetchIntents}
                                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                                    title="Refresh"
                                >
                                    <RefreshCw size={16} className={clsx(loading && 'animate-spin')} />
                                </button>
                                <button
                                    onClick={() => setShowCheckout(true)}
                                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
                                >
                                    <CreditCard size={15} />
                                    New Payment
                                </button>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center py-20 text-slate-400 text-sm gap-2">
                                <RefreshCw size={16} className="animate-spin" /> Loading…
                            </div>
                        ) : intents.length === 0 ? (
                            <div className="text-center py-20">
                                <CreditCard size={36} className="text-slate-200 mx-auto mb-3" />
                                <p className="text-slate-500 text-sm font-medium">No payments yet</p>
                                <p className="text-slate-400 text-xs mt-1">Click "New Payment" to simulate a checkout</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-100 bg-slate-50/60">
                                            {['Payment ID', 'Amount', 'Currency', 'Status', 'Idempotency Key'].map(h => (
                                                <th key={h} className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-6 py-3">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {intents.map(i => (
                                            <tr key={i.payment_intent_id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 font-mono text-xs text-slate-600">{i.payment_intent_id.slice(0, 24)}…</td>
                                                <td className="px-6 py-4 font-semibold text-slate-900 tabular-nums">{fmt(i.amount, i.currency)}</td>
                                                <td className="px-6 py-4 text-slate-600 uppercase">{i.currency}</td>
                                                <td className="px-6 py-4"><StatusBadge status={i.status} /></td>
                                                <td className="px-6 py-4 font-mono text-xs text-slate-400 truncate max-w-xs">{i.idempotency_key}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </main>

                {showCheckout && (
                    <CheckoutModal
                        onClose={() => setShowCheckout(false)}
                        onComplete={() => { setShowCheckout(false); fetchIntents() }}
                    />
                )}
            </div>
        </NexusBackground>
    )
}
