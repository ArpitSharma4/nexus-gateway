import { useState } from 'react'
import { X, Check, ArrowRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import api from '../lib/api'
import { toTitleCase } from '../lib/format'

// High-performance transaction simulator with live trace log

type Step = 'form' | 'processing' | 'result'

type TraceEntry = {
    timestamp: string
    source: string
    message: string
}

type Result = {
    payment_intent_id: string
    status: string
    gateway_used: string
    bank_decision: string
    bank_reason: string
    amount: number
    currency: string
    trace_log: TraceEntry[]
}

const TEST_CARDS = [
    { label: 'Success', number: '4111111111111111', hint: 'Standard card — always succeeds' },
    { label: 'Insufficient Funds', number: '4111110000', hint: 'Ends in 0000 — triggers decline' },
]

const CURRENCIES = [
    { code: 'INR', symbol: '₹', label: 'India (INR)' },
    { code: 'USD', symbol: '$', label: 'USA (USD)' },
    { code: 'EUR', symbol: '€', label: 'Europe (EUR)' },
    { code: 'GBP', symbol: '£', label: 'UK (GBP)' },
]

type Props = {
    onClose: () => void
    onComplete: (result: Result) => void
    onNavigateLegal: () => void
}

/* ── Animation variants ─────────────────────────────────────────────── */

const slideVariants = {
    enter: { opacity: 0, y: 24, scale: 0.97 },
    center: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -16, scale: 0.97 },
}

const transition = { duration: 0.35, ease: [0.4, 0, 0.2, 1] as const }


const GATEWAY_COLORS: Record<string, string> = {
    stripe: 'bg-violet-500',
    razorpay: 'bg-blue-500',
    simulator: 'bg-emerald-500',
}


/* ── Component ──────────────────────────────────────────────────────── */

export default function CheckoutModal({ onClose, onComplete, onNavigateLegal }: Props) {
    const [step, setStep] = useState<Step>('form')
    const [amount, setAmount] = useState('500.00')
    const [currency, setCurrency] = useState('INR')
    const [agreedToTerms, setAgreedToTerms] = useState(false)
    const [cardNumber, setCardNumber] = useState('')
    const [cvv, setCvv] = useState('')
    const [error, setError] = useState('')
    const [result, setResult] = useState<Result | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [logs, setLogs] = useState<string[]>([])
    const [ik, setIk] = useState<string>('ik_' + Math.random().toString(36).slice(2, 10))

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError('')
        setSubmitting(true)
        setStep('processing')

        const messages = [
            'Initializing secure handshake...',
            'Querying routing engine...',
            'AES-256 session established.',
            'Evaluating gateway health matrix...',
            'Selecting optimal gateway...',
            'Executing failover pipeline...',
            'Nexus node sync complete.',
            'Finalizing atomic transaction...'
        ]

        setLogs([messages[0]])

        // Progressively add "cinematic" logs while processing
        const logInterval = setInterval(() => {
            setLogs(prev => {
                if (prev.length < messages.length) {
                    return [...prev, messages[prev.length]]
                }
                return prev
            })
        }, 400)

        try {
            // 1. Create intent
            const { data: intent } = await api.post('/payments/create', {
                amount: Math.round(parseFloat(amount) * 100),
                currency,
                idempotency_key: ik
            })
            setIk(intent.idempotency_key)
            await new Promise(r => setTimeout(r, 600))

            // 2. Process
            const { data: processed } = await api.post(
                `/payments/${intent.payment_intent_id}/process`,
                { card_number: cardNumber, cvv }
            )

            await new Promise(r => setTimeout(r, 1200)) // Ensure cinematic feel
            clearInterval(logInterval)

            setResult({
                ...processed,
                amount: Math.round(parseFloat(amount) * 100),
                currency,
            })
            setStep('result')
        } catch (err: any) {
            clearInterval(logInterval)
            setLogs(prev => [...prev, 'SYSTEM_ERROR: Request Aborted'])
            await new Promise(r => setTimeout(r, 1000))
            setError(err.response?.data?.detail || 'Something went wrong. Please try again.')
            setStep('form')
            setIk('ik_' + Math.random().toString(36).slice(2, 10))
        } finally {
            setSubmitting(false)
        }
    }

    const isInsufficient = cardNumber.endsWith('0000')
    const isFraudulent = parseFloat(amount) > 1000
    const succeeded = result?.status === 'succeeded'

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div
                className="bg-white rounded-[24px] shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden relative"
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-slate-50/50 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                        <div className="bg-indigo-100 text-indigo-600 p-1.5 rounded-lg border border-indigo-200 font-bold" style={{ minWidth: '28px', minHeight: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>
                            NL
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-900 leading-none">NEXUS LAYER</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Checkout Simulator v2.0</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-900 transition p-1.5 rounded-xl hover:bg-slate-100">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <motion.div className="px-6 py-6" layout>
                    <AnimatePresence mode="wait">
                        {step === 'form' && (
                            <motion.form
                                key="form"
                                onSubmit={handleSubmit}
                                className="space-y-4"
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={transition}
                            >
                                {/* Amount & Logic Badge */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Transaction Amount</label>
                                        {isFraudulent && (
                                            <span className="text-[10px] font-black bg-red-50 text-red-600 px-2 py-0.5 rounded border border-red-100 animate-pulse">
                                                RULE: FRAUD_THRESHOLD_EXCEEDED
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="relative group flex-1">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">
                                                {CURRENCIES.find(c => c.code === currency)?.symbol || '₹'}
                                            </span>
                                            <input
                                                type="number"
                                                value={amount}
                                                onChange={e => setAmount(e.target.value)}
                                                required
                                                className="w-full pl-9 pr-4 py-3 bg-slate-50/50 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all"
                                            />
                                        </div>
                                        <div className="w-32">
                                            <select
                                                value={currency}
                                                onChange={e => setCurrency(e.target.value)}
                                                className="w-full px-3 py-3 bg-slate-50/50 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all appearance-none cursor-pointer"
                                            >
                                                {CURRENCIES.map(c => (
                                                    <option key={c.code} value={c.code}>{c.code}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Card Input & Logic Badge */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Technical Card Input</label>
                                        {isInsufficient && (
                                            <span className="text-[10px] font-black bg-amber-50 text-amber-600 px-2 py-0.5 rounded border border-amber-100 italic">
                                                TRIGGER: INSUFFICIENT_FUNDS
                                            </span>
                                        )}
                                    </div>
                                    <div className="space-y-2 mb-3">
                                        {TEST_CARDS.map(c => (
                                            <button
                                                key={c.number}
                                                type="button"
                                                onClick={() => setCardNumber(c.number)}
                                                className={clsx(
                                                    'w-full text-left px-4 py-2 rounded-xl border text-[11px] transition-all flex items-center justify-between group',
                                                    cardNumber === c.number
                                                        ? 'border-indigo-500 bg-indigo-50/50 text-indigo-700 shadow-sm'
                                                        : 'border-slate-100 hover:border-slate-200 text-slate-500'
                                                )}
                                            >
                                                <div className="flex flex-col">
                                                    <span className="font-black uppercase tracking-tighter">{c.label}</span>
                                                    <span className="opacity-60">{c.hint}</span>
                                                </div>
                                                <span className="font-mono bg-white/50 px-2 py-1 rounded border border-inherit">{c.number}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                                        <input
                                            type="text"
                                            value={cardNumber}
                                            onChange={e => setCardNumber(e.target.value)}
                                            placeholder="Full Card Number"
                                            required
                                            className="px-4 py-3 bg-slate-50/50 rounded-xl border border-slate-200 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-300"
                                        />
                                        <input
                                            type="text"
                                            value={cvv}
                                            onChange={e => setCvv(e.target.value)}
                                            placeholder="CVV"
                                            maxLength={4}
                                            required
                                            className="px-4 py-3 bg-slate-50/50 rounded-xl border border-slate-200 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-300 w-full sm:w-28"
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <div className="flex items-center gap-3 text-red-600 text-xs bg-red-50 border border-red-100 rounded-xl px-4 py-3 font-bold">
                                        <X size={14} className="shrink-0" />
                                        {error}
                                    </div>
                                )}

                                {/* Legal Accept */}
                                <div className="pt-4 border-t border-slate-100 mb-2">
                                    <label className="flex items-start gap-3 cursor-pointer group">
                                        <div className="relative flex items-center justify-center mt-0.5">
                                            <input
                                                type="checkbox"
                                                className="peer appearance-none w-4 h-4 rounded-md border-2 border-slate-200 checked:border-indigo-600 checked:bg-indigo-600 transition-all"
                                                checked={agreedToTerms}
                                                onChange={e => setAgreedToTerms(e.target.checked)}
                                            />
                                            <Check size={10} className="absolute text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                                        </div>
                                        <span className="text-[11px] text-slate-500 font-medium leading-tight group-hover:text-slate-700 transition-colors">
                                            I agree to the Nexus Beta <button type="button" onClick={(e) => { e.preventDefault(); onNavigateLegal(); }} className="text-indigo-600 font-bold hover:underline">Terms & Conditions</button>. I understand this is an experimental system.
                                        </span>
                                    </label>
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting || !agreedToTerms}
                                    className="w-full bg-slate-900 hover:bg-black text-white px-6 py-4 rounded-2xl relative overflow-hidden group transition-all h-[56px] disabled:opacity-30 disabled:pointer-events-none"
                                >
                                    <div className="absolute inset-0 flex items-center justify-center gap-2 group-hover:scale-105 transition-transform duration-300 font-bold text-sm tracking-tight text-indigo-100 uppercase">
                                        SIMULATE PAYMENT
                                    </div>
                                </button>

                                {/* Data Integrity Footer */}
                                <div className="pt-2 flex items-center justify-between border-t border-slate-50">
                                    <div className="flex items-center gap-1.5 opacity-40">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        <span className="text-[9px] font-black tracking-widest uppercase">IDEMPOTENCY_LINK_ACTIVE</span>
                                    </div>
                                    <span className="text-[10px] font-mono text-slate-300 truncate max-w-[140px]">{ik}</span>
                                </div>
                            </motion.form>
                        )}

                        {/* ── PROCESSING STATE (Terminal Mode) ──────────────── */}
                        {step === 'processing' && (
                            <motion.div
                                key="processing"
                                className="flex flex-col gap-4 py-8"
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={transition}
                            >
                                <div className="bg-slate-950 rounded-2xl p-6 font-mono text-[11px] min-h-[160px] shadow-2xl relative overflow-hidden">
                                    <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500 opacity-20" />
                                    <div className="flex flex-col gap-1.5">
                                        {logs.map((L, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ x: -10, opacity: 0 }}
                                                animate={{ x: 0, opacity: 1 }}
                                                className={L.startsWith('SYSTEM_ERROR') ? 'text-red-500' : 'text-emerald-500/80'}
                                            >
                                                {L}
                                            </motion.div>
                                        ))}
                                        {logs.length < 5 && (
                                            <motion.div
                                                animate={{ opacity: [0, 1] }}
                                                transition={{ repeat: Infinity, duration: 0.6 }}
                                                className="w-2 h-4 bg-emerald-500/50"
                                            />
                                        )}
                                    </div>
                                </div>
                                <div className="text-center animate-pulse">
                                    <span className="text-[10px] font-black text-indigo-600 tracking-[0.2em] uppercase">Processing Secure Pipeline...</span>
                                </div>
                            </motion.div>
                        )}

                        {/* ── RESULT STATE ─────────────────────────────── */}
                        {step === 'result' && result && (
                            <motion.div
                                key="result"
                                className="space-y-5"
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={transition}
                            >
                                <div className="flex flex-col items-center py-4">
                                    {succeeded ? (
                                        <motion.div
                                            className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mb-4 border border-emerald-100 shadow-inner"
                                            initial={{ scale: 0 }} animate={{ scale: 1 }}
                                            transition={{ type: 'spring', damping: 15, delay: 0.1 }}
                                        >
                                            <Check size={32} className="text-emerald-500" strokeWidth={3} />
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-4 border border-red-100 shadow-inner"
                                            initial={{ scale: 0 }}
                                            animate={{
                                                scale: 1,
                                                x: [0, -10, 10, -5, 5, 0],
                                                rotate: [0, -2, 2, -1, 1, 0]
                                            }}
                                            transition={{ duration: 0.4, delay: 0.1 }}
                                        >
                                            <X size={32} className="text-red-500" strokeWidth={3} />
                                        </motion.div>
                                    )}

                                    <h2 className={clsx('text-xl font-black italic tracking-tight', succeeded ? 'text-emerald-600' : 'text-red-600')}>
                                        {succeeded ? 'TRANSACTION_SUCCESS' : 'TRANSACTION_ABORTED'}
                                    </h2>
                                    <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-tighter">
                                        Decision: {result.bank_decision} // {result.bank_reason}
                                    </p>
                                </div>

                                <div className="bg-slate-50/80 rounded-2xl border border-slate-100 p-4 space-y-3">
                                    {[
                                        { label: 'Network ID', value: result.payment_intent_id.slice(0, 24) + '...', mono: true },
                                        { label: 'Final Value', value: new Intl.NumberFormat(undefined, { style: 'currency', currency: result.currency }).format(result.amount / 100) },
                                        { label: 'Gateway', value: result.gateway_used, mono: false, badge: true },
                                        { label: 'Atomic Key', value: ik, mono: true },
                                    ].map(row => (
                                        <div key={row.label} className="flex items-center justify-between text-[11px]">
                                            <span className="font-black text-slate-400 uppercase tracking-widest">{row.label}</span>
                                            {row.badge ? (
                                                <span className="inline-flex items-center gap-1.5 font-semibold tracking-tight text-slate-900">
                                                    <span className={clsx('w-2 h-2 rounded-full', GATEWAY_COLORS[row.value || ''] || 'bg-slate-400')} />
                                                    {toTitleCase(row.value)}
                                                </span>
                                            ) : (
                                                <span className={clsx('font-bold text-slate-700', row.mono && 'font-mono text-indigo-600')}>{row.value}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Live Trace Log */}
                                {result.trace_log && result.trace_log.length > 0 && (
                                    <div className="bg-slate-950 rounded-2xl p-4 overflow-hidden">
                                        <div className="flex items-center gap-1.5 mb-3">
                                            <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
                                            <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Routing Trace Log</span>
                                        </div>
                                        <div className="space-y-1.5 max-h-[140px] overflow-y-auto custom-scrollbar">
                                            {result.trace_log.map((entry, idx) => (
                                                <motion.div
                                                    key={idx}
                                                    initial={{ x: -8, opacity: 0 }}
                                                    animate={{ x: 0, opacity: 1 }}
                                                    transition={{ delay: idx * 0.08 }}
                                                    className="flex items-start gap-2 text-[11px] font-mono"
                                                >
                                                    <ArrowRight size={10} className="text-cyan-500/50 mt-0.5 shrink-0" />
                                                    <span className="text-slate-500">{entry.timestamp?.split('T')[1]?.split('.')[0] || entry.timestamp}</span>
                                                    <span className={clsx(
                                                        'font-bold',
                                                        entry.source === 'FAILOVER' ? 'text-amber-400' :
                                                            entry.source === 'ROUTER' ? 'text-cyan-400' :
                                                                entry.source === 'GATEWAY' ? 'text-emerald-400' :
                                                                    'text-slate-400'
                                                    )}>[{entry.source}]</span>
                                                    <span className="text-slate-300 break-all">{entry.message}</span>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-2 pt-2">
                                    <button
                                        onClick={() => { setStep('form'); setResult(null); setIk('ik_' + Math.random().toString(36).slice(2, 10)); setAgreedToTerms(false); }}
                                        className="flex-1 border-2 border-slate-200 text-slate-600 hover:bg-slate-50 font-black text-[11px] py-4 rounded-2xl transition-all uppercase tracking-widest"
                                    >
                                        RE-INITIATE
                                    </button>
                                    <button
                                        onClick={() => onComplete(result)}
                                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[11px] py-4 rounded-2xl transition-all uppercase tracking-widest shadow-xl shadow-indigo-100"
                                    >
                                        COMMIT & EXIT
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </motion.div>
        </div>
    )
}
