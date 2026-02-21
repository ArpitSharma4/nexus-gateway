import { motion } from 'framer-motion'
import { Shield, ScrollText, ArrowLeft, Zap } from 'lucide-react'
import NexusBackground from '../components/NexusBackground'

type Props = {
    onBack: () => void
}

export default function LegalPage({ onBack }: Props) {
    return (
        <NexusBackground active={false} tab="payments">
            <div className="min-h-screen">
                {/* Header */}
                <header className="bg-white border-b border-slate-200">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="bg-indigo-600 text-white p-1.5 rounded-lg">
                                <Zap size={18} />
                            </div>
                            <span className="font-bold text-slate-900">Nexus Layer</span>
                        </div>
                        <button
                            onClick={onBack}
                            className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition px-4 py-2 rounded-xl hover:bg-slate-50"
                        >
                            <ArrowLeft size={16} />
                            Back
                        </button>
                    </div>
                </header>

                <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white/40 backdrop-blur-xl rounded-[40px] border border-white/60 shadow-2xl shadow-indigo-500/5 overflow-hidden"
                    >
                        <div className="p-8 sm:p-12 space-y-12">
                            {/* Title */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-indigo-600 mb-2">
                                    <div className="bg-indigo-50 p-2 rounded-xl border border-indigo-100">
                                        <Shield size={20} />
                                    </div>
                                    <span className="text-xs font-black tracking-widest uppercase">Nexus Legal Center</span>
                                </div>
                                <h1 className="text-4xl font-black text-slate-900 tracking-tight">Legal & Compliance</h1>
                                <p className="text-slate-500 font-medium">Last updated: February 2026 • Beta Version 2.0</p>
                            </div>

                            <div className="grid grid-cols-1 gap-12">
                                {/* Privacy Policy */}
                                <section className="space-y-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
                                            <Shield size={20} />
                                        </div>
                                        <h2 className="text-xl font-black text-slate-900 italic tracking-tight uppercase">Privacy Policy (Beta)</h2>
                                    </div>
                                    <div className="space-y-6 text-slate-600 leading-relaxed font-medium">
                                        <div className="p-6 bg-white/60 rounded-3xl border border-white/80 space-y-4">
                                            <p>
                                                <strong className="text-slate-900 block mb-1">Data Collection:</strong>
                                                Nexus collects merchant API keys (encrypted at rest) and transaction metadata (amount, currency, status) solely for orchestration and analytics purposes.
                                            </p>
                                            <p>
                                                <strong className="text-slate-900 block mb-1">Data Usage:</strong>
                                                We do not sell your data. Your keys are used ONLY to communicate with Stripe and Razorpay on your behalf to process requested transactions.
                                            </p>
                                            <p>
                                                <strong className="text-slate-900 block mb-1">Storage:</strong>
                                                All credentials and transaction logs are stored securely via Supabase with Row-Level Security (RLS) enabled and professional AES-128 encryption for sensitive fields.
                                            </p>
                                            <p>
                                                <strong className="text-slate-900 block mb-1">Third Parties:</strong>
                                                Nexus shares transaction data with your enabled gateways (Stripe/Razorpay) to facilitate payment processing.
                                            </p>
                                        </div>
                                    </div>
                                </section>

                                {/* Terms & Conditions */}
                                <section className="space-y-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 border border-slate-100">
                                            <ScrollText size={20} />
                                        </div>
                                        <h2 className="text-xl font-black text-slate-900 italic tracking-tight uppercase">Terms & Conditions</h2>
                                    </div>
                                    <div className="space-y-6 text-slate-600 leading-relaxed font-medium">
                                        <div className="p-6 bg-white/60 rounded-3xl border border-white/80 space-y-4">
                                            <p>
                                                <strong className="text-slate-900 block mb-1">Beta Usage:</strong>
                                                Nexus is currently in "Open Beta." The service is provided "as is" without warranties of any kind regarding uptime, financial accuracy, or failover success rates.
                                            </p>
                                            <p>
                                                <strong className="text-slate-900 block mb-1">User Responsibility:</strong>
                                                Users are responsible for maintaining the confidentiality of their <code>nx_...</code> API keys and their respective gateway credentials.
                                            </p>
                                            <p>
                                                <strong className="text-slate-900 block mb-1">Prohibitions:</strong>
                                                You may not use Nexus for fraudulent activities, money laundering, or to bypass the security measures of supported gateways.
                                            </p>
                                            <p>
                                                <strong className="text-slate-900 block mb-1">Liability:</strong>
                                                Nexus is not liable for any financial loss resulting from gateway downtime, failed orchestration attempts, or misconfigured routing rules.
                                            </p>
                                        </div>
                                    </div>
                                </section>
                            </div>

                            {/* Footer inside main card */}
                            <div className="pt-8 border-t border-white/60 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <p className="text-xs font-bold text-slate-400 tracking-widest uppercase truncate">© 2026 NEXUS ORCHESTRATION ENGINE</p>
                                <button
                                    onClick={onBack}
                                    className="px-8 py-3 bg-slate-900 text-white text-sm font-black rounded-2xl hover:bg-slate-800 transition shadow-xl shadow-slate-200 uppercase tracking-widest"
                                >
                                    I Understand
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </main>
            </div>
        </NexusBackground>
    )
}
