import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Analytics } from '@vercel/analytics/react'
import api, { getSavedApiKey, setApiKey, clearApiKey } from './lib/api'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import LegalPage from './pages/LegalPage'
import SystemMonitor from './components/SystemMonitor'
import NexusLoader from './components/NexusLoader'
import { MerchantProvider } from './contexts/MerchantContext'

export type View = 'app' | 'legal'

export type Session = {
    apiKey: string
    merchantId?: string
    merchantName?: string
    isAdmin?: boolean
}

export default function App() {
    const [session, setSession] = useState<Session | null>(null)
    const [loading, setLoading] = useState(true)

    // Initial session restoration
    useEffect(() => {
        const minDelay = new Promise(resolve => setTimeout(resolve, 2500))
        const saved = getSavedApiKey()

        if (!saved) {
            minDelay.then(() => setLoading(false))
            return
        }

        // Detect if it's an admin key (simple heuristic or just try both)
        const isMasterKey = saved.startsWith('nexus_admin_')

        const fetchData = isMasterKey
            ? api.get('/admin/metrics', { headers: { 'X-Admin-Key': saved } })
                .then(() => {
                    setApiKey(saved)
                    setSession({ apiKey: saved, isAdmin: true })
                })
                .catch(() => clearApiKey())
            : api.post('/merchants/login', { api_key: saved })
                .then(({ data }) => {
                    setApiKey(saved)
                    setSession({ apiKey: saved, merchantId: data.id, merchantName: data.name })
                })
                .catch(() => clearApiKey())

        Promise.all([fetchData, minDelay]).finally(() => setLoading(false))
    }, [])

    const handleLogin = async (newSession: Session) => {
        setLoading(true)
        const minDelay = new Promise(resolve => setTimeout(resolve, 2500))
        setSession(newSession)
        await minDelay
        setLoading(false)
    }

    const handleLogout = () => {
        clearApiKey()
        setSession(null)
    }

    const [view, setView] = useState<View>('app')

    if (view === 'legal') {
        return <LegalPage onBack={() => setView('app')} />
    }

    return (
        <div className="relative min-h-screen bg-white font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900 overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
                {loading ? (
                    <motion.div
                        key="loader"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
                        transition={{ duration: 0.5, ease: 'easeInOut' }}
                    >
                        <NexusLoader />
                    </motion.div>
                ) : !session ? (
                    <motion.div
                        key="auth"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.05 }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                    >
                        <AuthPage onLogin={handleLogin} onNavigateLegal={() => setView('legal')} />
                    </motion.div>
                ) : (
                    <MerchantProvider>
                        <motion.div
                            key="dashboard"
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        >
                            <DashboardPage session={session} onLogout={handleLogout} onNavigateLegal={() => setView('legal')} />
                        </motion.div>
                        <SystemMonitor />
                    </MerchantProvider>
                )}
            </AnimatePresence>
            <Analytics />
        </div>
    )
}
