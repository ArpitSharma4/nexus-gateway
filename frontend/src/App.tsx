import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import api, { getSavedApiKey, setApiKey, clearApiKey } from './lib/api'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import SystemMonitor from './components/SystemMonitor'
import NexusLoader from './components/NexusLoader'

export type Session = {
    apiKey: string
    merchantName: string
}

export default function App() {
    const [session, setSession] = useState<Session | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    // Initial session restoration
    useEffect(() => {
        const minDelay = new Promise(resolve => setTimeout(resolve, 2500))
        const saved = getSavedApiKey()

        if (!saved) {
            minDelay.then(() => setIsLoading(false))
            return
        }

        const fetchData = api.post('/merchants/login', { api_key: saved })
            .then(({ data }) => {
                setApiKey(saved)
                setSession({ apiKey: saved, merchantName: data.name })
            })
            .catch(() => clearApiKey())

        Promise.all([fetchData, minDelay]).finally(() => setIsLoading(false))
    }, [])

    const handleLogin = async (newSession: Session) => {
        setIsLoading(true)
        const minDelay = new Promise(resolve => setTimeout(resolve, 2500))
        setSession(newSession)
        await minDelay
        setIsLoading(false)
    }

    const handleLogout = () => {
        clearApiKey()
        setSession(null)
    }

    return (
        <div className="relative min-h-screen bg-white font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900 overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
                {isLoading ? (
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
                        <AuthPage onLogin={handleLogin} />
                    </motion.div>
                ) : (
                    <motion.div
                        key="dashboard"
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <DashboardPage session={session} onLogout={handleLogout} />
                    </motion.div>
                )}
            </AnimatePresence>

            <SystemMonitor />
        </div>
    )
}
