import { useState, useEffect } from 'react'
import { ToggleLeft, ToggleRight, Plus, Save, Key, AlertCircle, CheckCircle2 } from 'lucide-react'
import clsx from 'clsx'
import api from '../lib/api'
import type { Session } from '../App'
import { AnimatePresence, LayoutGroup } from 'framer-motion'
import CreateRule from '../components/CreateRule'
import RuleCard from '../components/RuleCard'

import { useMerchant, type GatewayConfig } from '../contexts/MerchantContext'

type GatewayHealth = {
    gateway_name: string
    status: string
    latency_ms: number
    message: string
}

import { StripeLogo, RazorpayLogo, SimulatorLogo } from '../components/GatewayLogos'

const GATEWAYS = [
    { name: 'stripe', label: 'Stripe', color: 'from-[#635BFF] to-[#00D4FF]', desc: 'International payments — USD, EUR, GBP', Logo: StripeLogo },
    { name: 'razorpay', label: 'Razorpay', color: 'from-[#3395FF] to-[#012652]', desc: 'Optimized for INR — domestic India', Logo: RazorpayLogo },
    { name: 'simulator', label: 'Simulator', color: 'from-emerald-500 to-teal-500', desc: 'Built-in test gateway — no API key needed', Logo: SimulatorLogo },
]

const RULE_TYPES = [
    { value: 'priority', label: 'Priority' },
    { value: 'currency', label: 'Currency Match' },
    { value: 'amount_threshold', label: 'Amount Threshold' },
]

type Props = {
    session: Session
    onNavigateLegal: () => void
}

export default function SettingsPage({ session: _session, onNavigateLegal }: Props) {
    const {
        configs, rules, refreshAll,
        updateConfigOptimistic, rollbackConfig,
        deleteRuleOptimistic, rollbackRules
    } = useMerchant()
    const [health, setHealth] = useState<GatewayHealth[]>([])
    const [apiKeys, setApiKeys] = useState<Record<string, string>>({})
    const [razorpayKeys, setRazorpayKeys] = useState({ id: '', secret: '' })
    const [saving, setSaving] = useState<string | null>(null)
    const [showAddRule, setShowAddRule] = useState(false)

    useEffect(() => {
        fetchHealth()
        const timer = setInterval(() => fetchHealth(), 15000)
        return () => clearInterval(timer)
    }, [])

    async function fetchHealth() {
        try {
            const { data } = await api.get('/gateways/health')
            setHealth(data)
        } catch { /* ignore */ }
    }

    async function toggleGateway(gatewayName: string, enabled: boolean) {
        const previousConfigs = [...configs];

        // 1. Optimistic Update
        updateConfigOptimistic(gatewayName, enabled);
        setSaving(gatewayName)

        try {
            // 2. Background API call
            await api.put('/gateways/config', {
                gateway_name: gatewayName,
                enabled,
                api_key: apiKeys[gatewayName] || null,
            })
            // Refresh to ensure we have the latest server state (IDs, etc)
            await refreshAll()
        } catch (err) {
            // 3. Rollback on failure
            console.error("Failed to toggle gateway", err);
            rollbackConfig(previousConfigs);
            // In a real app, we'd show a toast here
        } finally {
            setSaving(null)
        }
    }

    async function saveApiKey(gatewayName: string) {
        setSaving(gatewayName)
        try {
            let apiKey = apiKeys[gatewayName] || null

            // For Razorpay, we combine ID and Secret with a colon
            if (gatewayName === 'razorpay') {
                if (razorpayKeys.id && razorpayKeys.secret) {
                    apiKey = `${razorpayKeys.id}:${razorpayKeys.secret}`
                }
            }

            await api.put('/gateways/config', {
                gateway_name: gatewayName,
                enabled: true,
                api_key: apiKey,
            })

            if (gatewayName === 'razorpay') {
                setRazorpayKeys({ id: '', secret: '' })
            } else {
                setApiKeys(prev => ({ ...prev, [gatewayName]: '' }))
            }
            await refreshAll()
        } catch { /* ignore */ }
        setSaving(null)
    }

    async function addRule(rule: any) {
        try {
            await api.post('/gateways/rules', rule)
            setShowAddRule(false)
            await refreshAll()
        } catch { /* ignore */ }
    }

    async function deleteRule(id: string) {
        const previousRules = [...rules]

        // 1. Optimistic Update
        deleteRuleOptimistic(id)

        try {
            // 2. Background API call
            await api.delete(`/gateways/rules/${id}`)
            // Optional: refresh to stay fully in sync with server state
            await refreshAll()
        } catch (err) {
            // 3. Rollback on failure
            console.error("Failed to delete rule", err)
            rollbackRules(previousRules)
        }
    }

    function getHealth(name: string): GatewayHealth | undefined {
        return health.find(h => h.gateway_name === name)
    }

    function getConfig(name: string): GatewayConfig | undefined {
        return configs.find(c => c.gateway_name === name)
    }

    function parseConditions(conditions: string | null): string {
        if (!conditions) return '—'
        try {
            const obj = JSON.parse(conditions)
            if (obj.currency) return `Currency = ${obj.currency}`
            if (obj.min_amount) return `Amount ≥ ${(obj.min_amount / 100).toFixed(2)}`
            return conditions
        } catch { return conditions }
    }

    return (
        <div className="space-y-8">
            {/* Gateway Toggle Section */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <h2 className="text-base font-semibold text-slate-900">Gateway Configuration</h2>
                </div>
                <p className="text-xs text-slate-500 mb-5">Enable or disable payment gateways and configure API keys.</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {GATEWAYS.map(gw => {
                        const cfg = getConfig(gw.name)
                        const hp = getHealth(gw.name)
                        const isEnabled = cfg?.enabled ?? (gw.name === 'simulator')

                        return (
                            <div key={gw.name} className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow duration-300">
                                {/* Header ribbon */}
                                <div className={clsx('h-1.5 bg-gradient-to-r', gw.color)} />

                                <div className="p-5 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={clsx('w-10 h-10 rounded-xl bg-white flex items-center justify-center p-1.5 shadow-lg shadow-slate-200/50 ring-1 ring-slate-100')}>
                                                <gw.Logo className="w-full h-full" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-sm tracking-tight text-slate-900">{gw.label}</div>
                                                <div className="text-[10px] text-slate-400 font-medium">{gw.desc}</div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => toggleGateway(gw.name, !isEnabled)}
                                            className={clsx(
                                                'transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2',
                                                saving === gw.name && 'opacity-50 pointer-events-none'
                                            )}
                                        >
                                            {isEnabled
                                                ? <ToggleRight size={32} className="text-emerald-500" />
                                                : <ToggleLeft size={32} className="text-slate-300" />
                                            }
                                        </button>
                                    </div>

                                    {/* Health status */}
                                    {hp && (
                                        <div className="flex items-center gap-2 text-xs">
                                            <span className={clsx('w-2 h-2 rounded-full', {
                                                'bg-emerald-500': hp.status === 'healthy',
                                                'bg-amber-500': hp.status === 'degraded',
                                                'bg-red-500': hp.status === 'down',
                                            })} />
                                            <span className="text-slate-500 uppercase tracking-wide font-medium">{hp.status}</span>
                                            <span className="text-slate-300">•</span>
                                            <span className="font-mono text-slate-600">{hp.latency_ms.toFixed(0)}ms</span>
                                        </div>
                                    )}

                                    {/* API Key input (not for simulator) */}
                                    {gw.name !== 'simulator' && (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                <Key size={11} />
                                                <span>{cfg?.has_api_key ? 'API key saved' : 'No API key set'}</span>
                                                {cfg?.has_api_key && <CheckCircle2 size={11} className="text-emerald-500" />}
                                            </div>

                                            {gw.name === 'razorpay' ? (
                                                <div className="space-y-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Key ID (rzp_test_...)"
                                                        value={razorpayKeys.id}
                                                        onChange={e => setRazorpayKeys(prev => ({ ...prev, id: e.target.value }))}
                                                        className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 font-mono transition"
                                                    />
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="password"
                                                            placeholder="Key Secret"
                                                            value={razorpayKeys.secret}
                                                            onChange={e => setRazorpayKeys(prev => ({ ...prev, secret: e.target.value }))}
                                                            className="flex-1 text-xs px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 font-mono transition"
                                                        />
                                                        <button
                                                            onClick={() => saveApiKey(gw.name)}
                                                            disabled={!razorpayKeys.id || !razorpayKeys.secret}
                                                            className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-30 disabled:pointer-events-none transition shadow-sm"
                                                        >
                                                            <Save size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex gap-2">
                                                    <input
                                                        type="password"
                                                        placeholder={gw.name === 'stripe' ? 'sk_test_...' : 'API Key'}
                                                        value={apiKeys[gw.name] || ''}
                                                        onChange={e => setApiKeys(prev => ({ ...prev, [gw.name]: e.target.value }))}
                                                        className="flex-1 text-xs px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 font-mono transition"
                                                    />
                                                    <button
                                                        onClick={() => saveApiKey(gw.name)}
                                                        disabled={!apiKeys[gw.name]}
                                                        className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-30 disabled:pointer-events-none transition shadow-sm"
                                                    >
                                                        <Save size={16} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Routing Rules Section */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <h2 className="text-base font-semibold text-slate-900">Routing Rules</h2>
                    </div>
                    <button
                        onClick={() => setShowAddRule(!showAddRule)}
                        className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition"
                    >
                        <Plus size={14} /> Add Rule
                    </button>
                </div>
                <p className="text-xs text-slate-500 mb-5">Define rules to automatically route payments to the best gateway.</p>

                {/* Add Rule Form */}
                <AnimatePresence>
                    {showAddRule && (
                        <CreateRule
                            gateways={GATEWAYS}
                            ruleTypes={RULE_TYPES}
                            onCreate={addRule}
                            onCancel={() => setShowAddRule(false)}
                        />
                    )}
                </AnimatePresence>

                {/* Rules List */}
                {rules.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                        <AlertCircle size={28} className="text-slate-200 mx-auto mb-2" />
                        <p className="text-sm text-slate-400">No routing rules configured</p>
                        <p className="text-xs text-slate-300 mt-1">Payments will use the default priority ordering</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <LayoutGroup>
                            <AnimatePresence initial={false}>
                                {rules.map((rule, idx) => (
                                    <RuleCard
                                        key={rule.id}
                                        rule={{ ...rule, conditions: rule.conditions || '' }}
                                        index={idx}
                                        onDelete={deleteRule}
                                        parseConditions={parseConditions}
                                    />
                                ))}
                            </AnimatePresence>
                        </LayoutGroup>
                    </div>
                )}
            </div>

            {/* Footer Legal Link */}
            <div className="flex justify-center pt-8 border-t border-slate-100">
                <button
                    onClick={onNavigateLegal}
                    className="text-[10px] font-black tracking-[0.2em] text-slate-300 hover:text-indigo-500 transition-colors flex items-center gap-2"
                >
                    <div className="w-4 h-px bg-slate-200" />
                    PRIVACY POLICY & TERMS OF SERVICE (BETA)
                    <div className="w-4 h-px bg-slate-200" />
                </button>
            </div>
        </div>
    )
}
