import { useState } from 'react'
import { Zap, AlertCircle, Copy, Check, KeyRound, User, Shield, Radio, Activity } from 'lucide-react'
import clsx from 'clsx'
import api, { setApiKey } from '../lib/api'
import type { Session } from '../App'
import NexusBackground from '../components/NexusBackground'

type Tab = 'signup' | 'login'
type Props = { onLogin: (s: Session) => void }

/* ── Inline SVG Illustration ───────────────────────────────────────── */

function NexusIllustration() {
    return (
        <div className="relative w-full max-w-[280px] mx-auto py-8">
            <svg viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full drop-shadow-2xl">
                {/* Visual Depth Blobs */}
                <circle cx="200" cy="200" r="160" fill="url(#paint0_radial)" fillOpacity="0.2" />

                {/* Connection Paths (Logical Flow) */}
                <g opacity="0.4">
                    {/* User 1 to Gateway */}
                    <path d="M100 120 Q150 120 230 200" stroke="#818CF8" strokeWidth="2" strokeDasharray="4 4" />
                    {/* User 2 to Gateway */}
                    <path d="M100 280 Q150 280 230 250" stroke="#818CF8" strokeWidth="2" strokeDasharray="4 4" />
                    {/* Merchant to Gateway */}
                    <path d="M330 200 Q300 200 280 220" stroke="#818CF8" strokeWidth="2" strokeDasharray="4 4" />
                </g>

                {/* Animated Data Particles */}
                <circle r="3" fill="#6366F1">
                    <animateMotion dur="3s" repeatCount="indefinite" path="M100 120 Q150 120 230 200" />
                </circle>
                <circle r="3" fill="#6366F1">
                    <animateMotion dur="2.5s" repeatCount="indefinite" path="M100 280 Q150 280 230 250" />
                </circle>

                {/* Node: User 1 */}
                <g transform="translate(80, 100)">
                    <circle cx="20" cy="20" r="18" fill="white" stroke="#6366F1" strokeWidth="1.5" />
                    <circle cx="20" cy="15" r="7" fill="#6366F1" />
                    <path d="M8 32 C8 26 13 23 20 23 C27 23 32 26 32 32" fill="#6366F1" />
                </g>

                {/* Node: User 2 */}
                <g transform="translate(80, 260)">
                    <circle cx="20" cy="20" r="18" fill="white" stroke="#6366F1" strokeWidth="1.5" />
                    <circle cx="20" cy="15" r="7" fill="#6366F1" />
                    <path d="M8 32 C8 26 13 23 20 23 C27 23 32 26 32 32" fill="#6366F1" />
                </g>

                {/* Node: Merchant */}
                <g transform="translate(310, 180)">
                    <circle cx="20" cy="20" r="18" fill="white" stroke="#6366F1" strokeWidth="1.5" />
                    <circle cx="20" cy="15" r="7" fill="#6366F1" />
                    <path d="M8 32 C8 26 13 23 20 23 C27 23 32 26 32 32" fill="#6366F1" />
                </g>

                {/* Central Gateway (Phone Hub) */}
                <g className="animate-float">
                    <rect x="230" y="140" width="80" height="150" rx="14" fill="#1E1B4B" />
                    <rect x="236" y="146" width="68" height="138" rx="10" fill="#4F46E5" />

                    {/* Status Indicator */}
                    <path d="M270 190 L270 230 M260 200 L270 190 L280 200" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="270" cy="260" r="6" stroke="white" strokeWidth="2" opacity="0.5" />
                </g>

                <defs>
                    <radialGradient id="paint0_radial" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(200 200) rotate(90) scale(160)">
                        <stop stopColor="#EEF2FF" />
                        <stop offset="1" stopColor="#EEF2FF" stopOpacity="0" />
                    </radialGradient>
                </defs>
            </svg>
        </div>
    )
}

/* ── Feature List Item ─────────────────────────────────────────────── */

function FeatureItem({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) {
    return (
        <div className="flex items-center gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl">
                <Icon size={18} />
            </div>
            <div>
                <p className="text-xs font-bold text-slate-900 leading-none mb-1">{title}</p>
                <p className="text-[10px] text-slate-500 leading-tight">{desc}</p>
            </div>
        </div>
    )
}

/* ── Auth Page ─────────────────────────────────────────────────────── */

export default function AuthPage({ onLogin }: Props) {
    const [tab, setTab] = useState<Tab>('signup')

    const [name, setName] = useState('')
    const [signupLoading, setSignupLoading] = useState(false)
    const [signupError, setSignupError] = useState('')
    const [newKey, setNewKey] = useState<{ key: string; biz: string } | null>(null)
    const [copied, setCopied] = useState(false)

    const [apiKeyInput, setApiKeyInput] = useState('')
    const [loginLoading, setLoginLoading] = useState(false)
    const [loginError, setLoginError] = useState('')

    const hasInput = tab === 'signup' ? name.trim().length > 0 : apiKeyInput.trim().length > 0

    async function handleSignup(e: React.FormEvent) {
        e.preventDefault()
        setSignupLoading(true)
        setSignupError('')
        try {
            const { data } = await api.post('/merchants/signup', { business_name: name })
            setNewKey({ key: data.api_key, biz: data.name })
        } catch (err: any) {
            const detail = err.response?.data?.detail
            if (Array.isArray(detail)) {
                setSignupError(detail.map((d: any) => d.msg).join('. '))
            } else {
                setSignupError(detail || 'Signup failed. Please try again.')
            }
        } finally {
            setSignupLoading(false)
        }
    }

    function handleCopyAndEnter() {
        if (!newKey) return
        navigator.clipboard.writeText(newKey.key)
        setCopied(true)
        setTimeout(() => {
            setApiKey(newKey.key)
            onLogin({ apiKey: newKey.key, merchantName: newKey.biz })
        }, 800)
    }

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault()
        setLoginLoading(true)
        setLoginError('')
        try {
            const { data } = await api.post('/merchants/login', { api_key: apiKeyInput })
            setApiKey(apiKeyInput)
            onLogin({ apiKey: apiKeyInput, merchantName: data.name })
        } catch (err: any) {
            setLoginError(err.response?.data?.detail || 'Invalid API key.')
        } finally {
            setLoginLoading(false)
        }
    }

    return (
        <NexusBackground>
            {/* Branding Anchor */}
            <div className="fixed left-6 top-1/2 -translate-y-1/2 -rotate-90 origin-left pointer-events-none select-none hidden 2xl:block">
                <span className="text-[10px] font-black tracking-[0.4em] text-slate-300 opacity-40 uppercase">
                    NEXUS GATEWAY V1.0 // SYSTEMS_ACTIVE
                </span>
            </div>

            <div className="h-screen w-screen flex items-center justify-center p-4 lg:p-8 overflow-hidden">
                {/* ── Main Card (Full White) ────────────────────────── */}
                <div
                    className="group w-full max-w-5xl bg-white rounded-[32px] shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-2 relative scale-[0.8] sm:scale-90 lg:scale-[0.85] 2xl:scale-100 transition-all duration-500 origin-center"
                    style={{ border: '1px solid #f1f5f9' }}
                >
                    {/* Vertical Divider (The "Spine") */}
                    <div className="hidden lg:block absolute left-1/2 top-[12%] bottom-[12%] w-px bg-gradient-to-b from-transparent via-indigo-100/50 to-transparent z-20 group-hover:via-indigo-400/40 transition-all duration-700" />

                    {/* Spine Junction Dots */}
                    <div className="hidden lg:block absolute left-1/2 top-[12%] -translate-x-1/2 w-1.5 h-1.5 rounded-full border border-indigo-200 bg-white z-20" />
                    <div className="hidden lg:block absolute left-1/2 bottom-[12%] -translate-x-1/2 w-1.5 h-1.5 rounded-full border border-indigo-200 bg-white z-20" />

                    {/* ── LEFT: Form Panel ─────────────────────── */}
                    <div className="py-8 lg:py-10 px-8 sm:px-12 lg:px-14 flex flex-col justify-center bg-white relative z-10">
                        {/* Logo */}
                        <div className="flex items-center gap-3 mb-6 lg:mb-8">
                            <div className="bg-indigo-600 text-white p-2 rounded-2xl shadow-lg shadow-indigo-100">
                                <Zap size={20} fill="white" />
                            </div>
                            <span className="text-2xl font-black text-slate-900 tracking-wider">
                                NEXUS GATEWAY
                            </span>
                        </div>

                        {/* Tabs */}
                        <div className="flex bg-slate-100 rounded-2xl p-1.5 mb-8 lg:mb-10">
                            <button
                                onClick={() => { setTab('signup'); setSignupError(''); setLoginError('') }}
                                className={clsx(
                                    'flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300',
                                    tab === 'signup' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'
                                )}
                            >
                                Sign Up
                            </button>
                            <button
                                onClick={() => { setTab('login'); setSignupError(''); setLoginError('') }}
                                className={clsx(
                                    'flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300',
                                    tab === 'login' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'
                                )}
                            >
                                Login
                            </button>
                        </div>

                        {/* Form Area */}
                        <div className="min-h-[300px] lg:min-h-[340px]">
                            {tab === 'signup' && (
                                <>
                                    {!newKey ? (
                                        <>
                                            <h1 className="text-2xl font-bold text-slate-900 mb-1 lg:mb-2">Create your account</h1>
                                            <p className="text-sm text-slate-500 mb-6 lg:mb-8 font-medium">Register your business to get a live API key.</p>

                                            <form onSubmit={handleSignup} className="space-y-4 lg:space-y-6">
                                                <div className="relative group">
                                                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                                    <input
                                                        type="text"
                                                        value={name}
                                                        onChange={e => setName(e.target.value)}
                                                        placeholder="Business Name"
                                                        required
                                                        minLength={5}
                                                        className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 text-sm text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-slate-50/30"
                                                    />
                                                </div>

                                                {signupError && (
                                                    <div className="flex items-start gap-3 text-red-600 text-sm bg-red-50 border border-red-100 rounded-2xl px-4 py-3.5">
                                                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                                        <span className="font-medium">{signupError}</span>
                                                    </div>
                                                )}

                                                <button
                                                    type="submit"
                                                    disabled={signupLoading || !name.trim()}
                                                    className={clsx(
                                                        'w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl text-sm transition-all duration-300 shadow-xl shadow-indigo-100 btn-shimmer',
                                                        hasInput && !signupLoading && 'btn-glow'
                                                    )}
                                                >
                                                    {signupLoading ? 'Generating...' : 'Create Account & Get API Key'}
                                                </button>
                                            </form>

                                            <div className="mt-6 lg:mt-8 text-center lg:text-left">
                                                <p className="text-xs text-slate-400 font-medium">
                                                    Already have an API key?{' '}
                                                    <button onClick={() => setTab('login')} className="text-indigo-600 hover:underline font-bold">
                                                        Login here
                                                    </button>
                                                </p>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="space-y-4 lg:space-y-6">
                                            <div className="flex items-center gap-3 text-emerald-600 mb-2">
                                                <div className="bg-emerald-100 p-1.5 rounded-full"><Check size={20} /></div>
                                                <span className="text-xl font-bold">Account created!</span>
                                            </div>
                                            <p className="text-sm text-slate-600 font-medium">
                                                Save your API key for <strong>{newKey.biz}</strong>. It won't be shown again.
                                            </p>
                                            <div className="bg-slate-900 text-emerald-400 font-mono text-xs rounded-2xl px-5 py-4 break-all select-all shadow-inner">
                                                {newKey.key}
                                            </div>
                                            <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 text-[11px] text-amber-800 font-medium leading-relaxed">
                                                ⚠️ Note: We do not store plain-text keys. If lost, you'll need to create a new business account.
                                            </div>
                                            <button
                                                onClick={handleCopyAndEnter}
                                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl text-sm transition-all btn-shimmer btn-glow flex items-center justify-center gap-2"
                                            >
                                                {copied ? <Check size={18} /> : <Copy size={18} />}
                                                {copied ? 'Copied! Opening Dashboard...' : 'Copy & Open Dashboard'}
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}

                            {tab === 'login' && (
                                <>
                                    <h1 className="text-2xl font-bold text-slate-900 mb-1 lg:mb-2">Welcome back</h1>
                                    <p className="text-sm text-slate-500 mb-6 lg:mb-8 font-medium">Paste your API key to access your dashboard.</p>

                                    <form onSubmit={handleLogin} className="space-y-4 lg:space-y-6">
                                        <div className="relative group">
                                            <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                            <input
                                                type="text"
                                                value={apiKeyInput}
                                                onChange={e => setApiKeyInput(e.target.value)}
                                                placeholder="nx_..."
                                                required
                                                className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 text-sm text-slate-900 font-mono font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-slate-50/30"
                                            />
                                        </div>

                                        {loginError && (
                                            <div className="flex items-center gap-3 text-red-600 text-sm bg-red-50 border border-red-100 rounded-2xl px-4 py-3.5">
                                                <AlertCircle size={16} className="shrink-0" />
                                                <span className="font-medium">{loginError}</span>
                                            </div>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={loginLoading || !apiKeyInput.trim()}
                                            className={clsx(
                                                'w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl text-sm transition-all duration-300 shadow-xl shadow-indigo-100 btn-shimmer',
                                                hasInput && !loginLoading && 'btn-glow'
                                            )}
                                        >
                                            {loginLoading ? 'Verifying...' : 'Login to Dashboard'}
                                        </button>
                                    </form>

                                    <div className="mt-6 lg:mt-8 text-center lg:text-left">
                                        <p className="text-xs text-slate-400 font-medium">
                                            Don't have an account?{' '}
                                            <button onClick={() => setTab('signup')} className="text-indigo-600 hover:underline font-bold">
                                                Sign up here
                                            </button>
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* ── RIGHT: Illustration Panel ────────────── */}
                    <div className="hidden lg:flex flex-col items-center justify-center py-8 lg:py-10 px-10 lg:px-14 relative bg-white overflow-hidden">
                        {/* Illustration Content */}
                        <div className="relative z-10 w-full mb-6 lg:mb-8">
                            <NexusIllustration />
                            <div className="text-center mt-2">
                                <h2 className="text-xl font-bold text-slate-900 mb-2">Secure Payment Gateway</h2>
                                <p className="text-sm text-slate-500 max-w-[280px] mx-auto font-medium leading-relaxed">
                                    Connect your business to a seamless payment network with real-time processing.
                                </p>
                            </div>
                        </div>

                        {/* Feature Cards Column */}
                        <div className="w-full max-w-[320px] space-y-3 lg:space-y-4 relative z-10">
                            <FeatureItem icon={Shield} title="AES-256 Encryption" desc="Bank-grade security on every transaction" />
                            <FeatureItem icon={Radio} title="Real-time Webhooks" desc="Instant payment event notifications" />
                        </div>

                        {/* Soft decorative background circles */}
                        <div className="absolute top-[-40px] right-[-40px] w-32 h-32 rounded-full bg-indigo-50/30" />
                        <div className="absolute bottom-10 left-[-20px] w-20 h-20 rounded-full bg-blue-50/20" />
                    </div>

                </div>
            </div>

            <style>{`
                @keyframes float {
                    0% { transform: translateY(0px); }
                    50% { transform: translateY(-8px); }
                    100% { transform: translateY(0px); }
                }
                .animate-float {
                    animation: float 4s ease-in-out infinite;
                }
            `}</style>
        </NexusBackground>
    )
}
