import { motion, AnimatePresence } from 'framer-motion'
import { X, Shield, ScrollText } from 'lucide-react'

type Props = {
    isOpen: boolean
    onClose: () => void
}

export default function LegalModal({ isOpen, onClose }: Props) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-2xl bg-white rounded-[32px] shadow-2xl overflow-hidden border border-slate-200"
                    >
                        <div className="p-6 sm:p-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
                            <button
                                onClick={onClose}
                                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition"
                            >
                                <X size={20} />
                            </button>

                            <div className="space-y-8">
                                {/* Header */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-indigo-600 mb-2">
                                        <div className="bg-indigo-50 p-1.5 rounded-lg">
                                            <Shield size={16} />
                                        </div>
                                        <span className="text-xs font-black tracking-widest uppercase">Nexus Compliance</span>
                                    </div>
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Privacy & Terms of Service</h2>
                                    <p className="text-sm text-slate-500 font-medium">Last updated: February 2026 • Beta Version</p>
                                </div>

                                {/* Content Section */}
                                <div className="space-y-6">
                                    <section className="space-y-3">
                                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                            <Shield size={14} className="text-slate-400" />
                                            Privacy Policy (Beta)
                                        </h3>
                                        <div className="space-y-4 text-slate-600 text-sm leading-relaxed font-medium">
                                            <p>
                                                <strong>Data Collection:</strong> Nexus collects merchant API keys (encrypted at rest) and transaction metadata (amount, currency, status) solely for orchestration and analytics purposes.
                                            </p>
                                            <p>
                                                <strong>Data Usage:</strong> We do not sell your data. Your keys are used ONLY to communicate with Stripe and Razorpay on your behalf to process requested transactions.
                                            </p>
                                            <p>
                                                <strong>Storage:</strong> All credentials and transaction logs are stored securely via Supabase with Row-Level Security (RLS) enabled and professional AES-128 encryption for sensitive fields.
                                            </p>
                                            <p>
                                                <strong>Third Parties:</strong> Nexus shares transaction data with your enabled gateways (Stripe/Razorpay) to facilitate payment processing.
                                            </p>
                                        </div>
                                    </section>

                                    <div className="h-px bg-slate-100" />

                                    <section className="space-y-3">
                                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                            <ScrollText size={14} className="text-slate-400" />
                                            Terms & Conditions
                                        </h3>
                                        <div className="space-y-4 text-slate-600 text-sm leading-relaxed font-medium">
                                            <p>
                                                <strong>Beta Usage:</strong> Nexus is currently in "Open Beta." The service is provided "as is" without warranties of any kind regarding uptime, financial accuracy, or failover success rates.
                                            </p>
                                            <p>
                                                <strong>User Responsibility:</strong> Users are responsible for maintaining the confidentiality of their <code>nx_...</code> API keys and their respective gateway credentials.
                                            </p>
                                            <p>
                                                <strong>Prohibited Acts:</strong> You may not use Nexus for fraudulent activities, money laundering, or to bypass the security measures of supported gateways.
                                            </p>
                                            <p>
                                                <strong>Limitation of Liability:</strong> Nexus is not liable for any financial loss resulting from gateway downtime, failed orchestration attempts, or misconfigured routing rules.
                                            </p>
                                        </div>
                                    </section>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={onClose}
                                className="px-6 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition shadow-lg shadow-slate-200"
                            >
                                I UNDERSTAND
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
