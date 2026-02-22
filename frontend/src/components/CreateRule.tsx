import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { motion } from 'framer-motion'
import clsx from 'clsx'
import { toTitleCase } from '../lib/format'
import Dropdown from './Dropdown'

type Props = {
    gateways: { name: string; label: string }[]
    ruleTypes: { value: string; label: string }[]
    onCreate: (rule: any) => Promise<void>
    onCancel: () => void
}

export default function CreateRule({ gateways, ruleTypes, onCreate, onCancel }: Props) {
    const [newRule, setNewRule] = useState({
        rule_type: 'currency',
        gateway_name: 'razorpay',
        conditions: '{"currency":"INR"}',
        priority: 0
    })
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        try {
            await onCreate(newRule)
        } finally {
            setIsSubmitting(false)
        }
    }

    const inputClasses = "w-full bg-white/80 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all duration-300 font-medium"
    const labelClasses = "block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-600 mb-1.5 ml-1"

    const gatewayOptions = gateways.map(g => ({ value: g.name, label: toTitleCase(g.name) }))

    return (
        <motion.div
            initial={{ height: 0, opacity: 0, scale: 0.95 }}
            animate={{ height: 'auto', opacity: 1, scale: 1 }}
            exit={{ height: 0, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="overflow-visible mb-6"
        >
            <div
                className="rounded-[24px] p-6 relative group shadow-xl shadow-slate-200/50"
                style={{
                    background: 'rgba(255, 255, 255, 0.7)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    border: '1px solid rgba(209, 213, 219, 0.3)'
                }}
            >
                {/* Background Glow */}
                <div className="absolute -inset-px bg-gradient-to-br from-indigo-500/5 via-transparent to-cyan-500/5 rounded-[24px] pointer-events-none" />

                <form onSubmit={handleSubmit} className="relative z-10 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight italic">New Strategic Rule</h3>
                                <p className="text-[11px] text-slate-500 font-medium">Define high-performance routing logic.</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onCancel}
                            className="p-2 text-slate-400 hover:text-slate-900 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className={labelClasses}>Rule Type</label>
                            <Dropdown
                                value={newRule.rule_type}
                                options={ruleTypes}
                                onChange={val => setNewRule(p => ({ ...p, rule_type: val }))}
                                className="bg-white/80"
                            />
                        </div>
                        <div>
                            <label className={labelClasses}>Target Gateway</label>
                            <Dropdown
                                value={newRule.gateway_name}
                                options={gatewayOptions}
                                onChange={val => setNewRule(p => ({ ...p, gateway_name: val }))}
                                className="bg-white/80"
                            />
                        </div>
                        <div className="lg:col-span-1">
                            <label className={labelClasses}>JSON Logic</label>
                            <input
                                value={newRule.conditions}
                                onChange={e => setNewRule(p => ({ ...p, conditions: e.target.value }))}
                                placeholder='{"currency":"INR"}'
                                className={clsx(inputClasses, "font-mono text-xs")}
                            />
                        </div>
                        <div>
                            <label className={labelClasses}>Priority</label>
                            <input
                                type="number"
                                value={newRule.priority}
                                onChange={e => setNewRule(p => ({ ...p, priority: parseInt(e.target.value) || 0 }))}
                                className={inputClasses}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <motion.button
                            type="submit"
                            disabled={isSubmitting}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs tracking-widest uppercase px-8 py-3.5 rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-3 group relative overflow-hidden"
                        >
                            {/* Pulse animation overlay */}
                            <motion.div
                                className="absolute inset-0 bg-white/20"
                                initial={{ opacity: 0 }}
                                whileHover={{ opacity: [0, 1, 0] }}
                                transition={{ repeat: Infinity, duration: 1.5 }}
                            />
                            {isSubmitting ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Plus size={16} strokeWidth={3} />
                                    <span>Establish Rule</span>
                                </>
                            )}
                        </motion.button>
                    </div>
                </form>
            </div>
        </motion.div>
    )
}

