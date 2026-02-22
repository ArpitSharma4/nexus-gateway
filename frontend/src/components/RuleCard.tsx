import { Trash2, MoveRight, Filter } from 'lucide-react'
import { motion } from 'framer-motion'
import clsx from 'clsx'
import { toTitleCase } from '../lib/format'
import { StripeLogo, RazorpayLogo, SimulatorLogo } from './GatewayLogos'

const GatewayMiniLogo = ({ name }: { name: string }) => {
    switch (name.toLowerCase()) {
        case 'stripe': return <div className="p-1 rounded bg-white shadow-sm ring-1 ring-slate-100"><StripeLogo className="w-3 h-3" /></div>
        case 'razorpay': return <div className="p-1 rounded bg-white shadow-sm ring-1 ring-slate-100"><RazorpayLogo className="w-3 h-3" /></div>
        default: return <div className="p-1 rounded bg-slate-500 text-white shadow-sm"><SimulatorLogo className="w-3 h-3" /></div>
    }
}

type Rule = {
    id: string
    rule_type: string
    gateway_name: string
    conditions: string
    priority: number
}

type Props = {
    rule: Rule
    index: number
    onDelete: (id: string) => Promise<void>
    parseConditions: (conditions: string) => string
}

const PRIORITY_COLORS: Record<number, string> = {
    0: 'bg-emerald-500',
    1: 'bg-indigo-500',
    2: 'bg-blue-500',
}

export default function RuleCard({ rule, index, onDelete, parseConditions }: Props) {
    const priorityColor = PRIORITY_COLORS[rule.priority] || 'bg-slate-400'

    return (
        <motion.div
            layout
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 20, opacity: 0 }}
            className="group relative bg-white/70 backdrop-blur-xl border border-slate-200/60 rounded-2xl overflow-hidden shadow-lg shadow-blue-500/5 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300"
        >
            {/* Priority Bar */}
            <div className={clsx("absolute left-0 top-0 bottom-0 w-1", priorityColor)} />

            <div className="px-6 py-4 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-6">
                    <div className="flex flex-col items-center justify-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Prio</span>
                        <span className="text-sm font-black text-slate-800 tabular-nums">{rule.priority}</span>
                    </div>

                    <div className="h-8 w-px bg-slate-200/50" />

                    <div className="space-y-1.5">
                        <div className="flex items-center gap-3">
                            <span className={clsx(
                                'px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border',
                                {
                                    'bg-violet-50 text-violet-600 border-violet-100': rule.rule_type === 'priority',
                                    'bg-blue-50 text-blue-600 border-blue-100': rule.rule_type === 'currency',
                                    'bg-amber-50 text-amber-600 border-amber-100': rule.rule_type === 'amount_threshold',
                                }
                            )}>
                                {rule.rule_type.replace('_', ' ')}
                            </span>

                            <div className="flex items-center gap-2 text-slate-400">
                                <MoveRight size={14} className="group-hover:translate-x-1 transition-transform" />
                            </div>

                            <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                    <GatewayMiniLogo name={rule.gateway_name} />
                                    <span className="text-sm font-bold text-slate-900 tracking-tight">
                                        {toTitleCase(rule.gateway_name)}
                                    </span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-medium italic mt-0.5">Primary Target</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Filter size={12} className="text-slate-400" />
                            <div className="text-[11px] font-medium text-slate-500">
                                {parseConditions(rule.conditions)}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onDelete(rule.id)}
                        className="opacity-0 group-hover:opacity-100 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200"
                        title="Delete Rule"
                    >
                        <Trash2 size={18} strokeWidth={1.5} />
                    </button>

                    <div className="text-[10px] font-black text-slate-200 uppercase tracking-widest select-none">
                        IDX_{index + 1}
                    </div>
                </div>
            </div>
        </motion.div>
    )
}
