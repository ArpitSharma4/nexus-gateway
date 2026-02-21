import { useState } from 'react'
import { Check, Code2, Terminal, Globe, X } from 'lucide-react'
import clsx from 'clsx'
import CodeBlock from '../components/CodeBlock'

type Props = { apiKey: string }

const TABS = [
    { id: 'javascript', label: 'JavaScript', icon: <Code2 size={13} /> },
    { id: 'python', label: 'Python', icon: <Terminal size={13} /> },
    { id: 'curl', label: 'cURL', icon: <Globe size={13} /> },
]

function getSnippet(tab: string, apiKey: string): string {
    const maskedKey = apiKey ? `${apiKey.slice(0, 12)}...` : 'nx_your_api_key_here'

    if (tab === 'javascript') {
        return `// ── Nexus Layer SDK ──────────────────────────
// Replace stripe.confirmCardPayment with a single call

const NEXUS_API = 'https://your-domain.vercel.app/api';
const API_KEY = '${maskedKey}';

async function processPayment(amount, currency = 'INR') {
  // Step 1: Create a Payment Intent
  const intentRes = await fetch(\`\${NEXUS_API}/payments/create\`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': API_KEY,
    },
    body: JSON.stringify({ amount, currency }),
  });
  const intent = await intentRes.json();

  // Step 2: Process the Payment
  // Nexus Layer automatically routes to the best gateway
  const processRes = await fetch(
    \`\${NEXUS_API}/payments/\${intent.payment_intent_id}/process\`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': API_KEY,
      },
      body: JSON.stringify({
        card_number: '4111111111111111',
        cvv: '123',
      }),
    }
  );
  const result = await processRes.json();

  console.log('Gateway used:', result.gateway_used);
  console.log('Status:', result.status);
  console.log('Trace:', result.trace_log);

  return result;
}

// Usage — replaces stripe.confirmCardPayment()
processPayment(5000, 'INR').then(console.log);`
    }

    if (tab === 'python') {
        return `# ── Nexus Layer SDK ──────────────────────────
# Replace stripe.PaymentIntent.create with a single call

import requests

NEXUS_API = "https://your-domain.vercel.app/api"
API_KEY = "${maskedKey}"

headers = {
    "Content-Type": "application/json",
    "X-API-KEY": API_KEY,
}

# Step 1: Create a Payment Intent
intent = requests.post(
    f"{NEXUS_API}/payments/create",
    headers=headers,
    json={"amount": 5000, "currency": "INR"},
).json()

print(f"Intent: {intent['payment_intent_id']}")

# Step 2: Process — Nexus Layer routes to the best gateway
result = requests.post(
    f"{NEXUS_API}/payments/{intent['payment_intent_id']}/process",
    headers=headers,
    json={"card_number": "4111111111111111", "cvv": "123"},
).json()

print(f"Gateway: {result['gateway_used']}")
print(f"Status:  {result['status']}")
print(f"Trace:   {result['trace_log']}")`
    }

    return `# ── Nexus Layer — cURL ──────────────────────────

# Step 1: Create a Payment Intent
curl -X POST https://your-domain.vercel.app/api/payments/create \\
  -H "Content-Type: application/json" \\
  -H "X-API-KEY: ${maskedKey}" \\
  -d '{"amount": 5000, "currency": "INR"}'

# Response → { "payment_intent_id": "pi_abc123...", ... }

# Step 2: Process the Payment
curl -X POST https://your-domain.vercel.app/api/payments/PI_ID/process \\
  -H "Content-Type: application/json" \\
  -H "X-API-KEY: ${maskedKey}" \\
  -d '{"card_number": "4111111111111111", "cvv": "123"}'

# Response includes gateway_used, status, and full trace_log`
}

export default function IntegrationPage({ apiKey }: Props) {
    const [activeTab, setActiveTab] = useState('javascript')

    const code = getSnippet(activeTab, apiKey)

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                        <Code2 size={20} />
                    </div>
                    Integration Guide
                </h2>
                <p className="text-sm text-slate-500 mt-2 max-w-2xl">
                    Nexus Layer wraps complex multi-gateway logic into a single atomic API.
                    Replace <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[12px] font-mono text-indigo-600 font-bold">stripe.confirmCardPayment</code> with our streamlined orchestration layer.
                </p>
            </div>

            {/* Before / After comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3">
                        <span className="text-[10px] font-black bg-red-50 text-red-500 px-2.5 py-1 rounded-full border border-red-100">LEGACY_STACK</span>
                    </div>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
                            <X size={16} strokeWidth={3} />
                        </div>
                        <span className="text-sm font-bold text-slate-900">Direct Gateway Integration</span>
                    </div>
                    <pre className="text-[12px] font-mono text-slate-400 bg-slate-50 rounded-xl p-4 overflow-x-auto leading-relaxed border border-slate-100 select-none">
                        {`const stripe = Stripe('sk_...');
const intent = await stripe.paymentIntents.create({
    amount: 5000,
    currency: 'inr'
});
// ✗ No auto-failover
// ✗ No currency routing`}
                    </pre>
                </div>

                <div className="bg-[#0f172a] rounded-2xl p-6 relative overflow-hidden group shadow-xl shadow-slate-200/50 border border-slate-800">
                    <div className="absolute top-0 right-0 p-3">
                        <span className="text-[10px] font-black bg-slate-800 text-slate-400 px-2.5 py-1 rounded-full border border-slate-700">NEXUS_CORE</span>
                    </div>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center border border-indigo-500/20">
                            <Check size={16} strokeWidth={3} />
                        </div>
                        <span className="text-sm font-bold text-slate-200">Nexus Orchestration</span>
                    </div>
                    <pre className="text-[12px] font-mono text-slate-400 bg-slate-900/50 rounded-xl p-4 overflow-x-auto leading-relaxed border border-white/5 backdrop-blur-sm">
                        {`const result = await nexus.process(5000, 'INR');

// ✓ Dynamic routing enabled
// ✓ Failover logic active
// ✓ Live observability trace`}
                    </pre>
                </div>
            </div>

            {/* Code Snippet */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={clsx(
                                    'flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all',
                                    activeTab === tab.id
                                        ? 'bg-white text-indigo-600 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-800'
                                )}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <CodeBlock
                    code={code}
                    language={activeTab}
                />
            </div>
        </div>
    )
}
