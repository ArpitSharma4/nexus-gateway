import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Calendar, Download, FileText, FileJson, Loader2, ShieldAlert } from 'lucide-react'
import clsx from 'clsx'
import api from '../lib/api'

type Props = {
    onClose: () => void
}

export default function StatementModal({ onClose }: Props) {
    const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
    const [format, setFormat] = useState<'csv' | 'pdf'>('pdf')
    const [loading, setLoading] = useState(false)

    const handleExport = async () => {
        setLoading(true)
        try {
            const response = await api.get('/payments/export/secure', {
                params: {
                    start_date: startDate,
                    end_date: endDate,
                    format: format
                },
                responseType: 'blob'
            })

            // Trigger download of the blob
            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = url
            const ext = format === 'pdf' ? 'pdf' : 'zip'
            link.setAttribute('download', `nexus_statement_${startDate}_${endDate}.${ext}`)
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)

            onClose()
        } catch (err) {
            console.error('Export failed', err)
            alert('Export failed. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200"
            >
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Download Statement</h2>
                        <p className="text-xs text-slate-500">Select period and format</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200/50 rounded-full text-slate-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Security Alert */}
                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
                        <div className="bg-amber-100 p-1.5 rounded-lg text-amber-700">
                            <ShieldAlert size={16} />
                        </div>
                        <div className="space-y-1">
                            <p className="text-[11px] font-bold text-amber-900 uppercase tracking-tight">Security Lock Active</p>
                            <p className="text-[10px] text-amber-800 leading-relaxed font-medium">
                                This file will be password protected. Use your <b>API Key</b> (found in the HUD above) to unlock the document.
                            </p>
                        </div>
                    </div>

                    {/* Date Range */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                <Calendar size={10} /> Start Date
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                <Calendar size={10} /> End Date
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                            />
                        </div>
                    </div>

                    {/* Format Selector */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Export Format</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setFormat('pdf')}
                                className={clsx(
                                    "flex items-center justify-center gap-2 p-4 rounded-2xl border transition-all duration-200",
                                    format === 'pdf'
                                        ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm"
                                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                                )}
                            >
                                <FileText size={18} />
                                <span className="text-sm font-bold">PDF Report</span>
                            </button>
                            <button
                                onClick={() => setFormat('csv')}
                                className={clsx(
                                    "flex items-center justify-center gap-2 p-4 rounded-2xl border transition-all duration-200",
                                    format === 'csv'
                                        ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm"
                                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                                )}
                            >
                                <FileJson size={18} />
                                <span className="text-sm font-bold">CSV (ZIP)</span>
                            </button>
                        </div>
                    </div>

                    {/* Disclaimer */}
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 italic">
                        <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                            Statements generated include all transaction attempts, status codes, and routing details for the selected period.
                        </p>
                    </div>

                    <button
                        onClick={handleExport}
                        disabled={loading}
                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-slate-900/20 hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 group"
                    >
                        {loading ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <>
                                <Download size={16} className="group-hover:translate-y-0.5 transition-transform" />
                                <span>Generate Statement</span>
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    )
}
